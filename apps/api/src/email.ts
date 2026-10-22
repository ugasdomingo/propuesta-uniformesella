import { config, emailConfigured } from './config.js';
import { EmailModel, RequestModel } from './models.js';
import type { StoredRequest } from './models.js';
import type { Types } from 'mongoose';

export async function enqueueEmails(requestId: string | Types.ObjectId) {
  for (const role of ['business', 'customer']) await EmailModel.updateOne({ requestId, role }, { $setOnInsert: { status: emailConfigured ? 'pending' : 'unconfigured', attempts: 0, nextAttemptAt: new Date() } }, { upsert: true });
}
function body(request: StoredRequest, customer: boolean) {
  const lines = request.lines.map(l => `${l.reference} · ${l.name} · ${l.colorName} (${l.color}) · ${l.size} · ${l.quantity} uds.`).join('\n');
  return [config.DEMO_MODE === 'true' ? 'DEMOSTRACIÓN. Destinatarios redirigidos al buzón de desarrollo.' : '',
    customer ? `Hemos recibido tu solicitud ${request.number}.` : `Nueva solicitud ${request.number} (${request.type}).`,
    'No constituye un pedido confirmado: precio, stock y plazos requieren confirmación comercial.',
    `Nombre: ${request.contact.name}`, `Email: ${request.contact.email}`, `Teléfono: ${request.contact.phone}`, `Empresa: ${request.contact.company || '—'}`,
    '\nPRENDAS', lines, '\nPERSONALIZACIÓN', request.personalization.enabled ? `${request.personalization.technique}. Ubicación: ${request.personalization.placement || 'Por definir'}. ${request.personalization.notes}` : 'Sin personalización',
    `Logo: ${request.personalization.uploadId ? 'Adjunto privado; consultar desde el panel' : 'Sin adjunto'}`,
    `Fecha deseada: ${request.desiredDate || 'Por acordar'}`, `Observaciones: ${request.notes || '—'}`,
    customer ? 'El equipo se pondrá en contacto contigo para concretar la propuesta.' : `Panel privado: ${config.APP_URL}/admin/solicitudes`,
  ].filter(Boolean).join('\n');
}
let running = false;
export async function processEmails() {
  if (running || !emailConfigured) return;
  running = true;
  try {
    // A crash between saving the request and creating jobs is recoverable.
    const missing = await RequestModel.find({ demo: false }).select('_id').lean();
    for (const request of missing) await enqueueEmails(request._id);
    await EmailModel.updateMany({ status: 'unconfigured' }, { $set: { status: 'pending' } });
    await EmailModel.updateMany({ status: 'sending', leaseUntil: { $lt: new Date() }, attempts: { $gte: 5 } }, { $set: { status: 'failed', lastError: 'El proceso se interrumpió en el último intento. Revisar el proveedor antes de reintentar.' }, $unset: { leaseUntil: 1 } });
    for (let i = 0; i < 10; i++) {
      const job = await EmailModel.findOneAndUpdate({ attempts: { $lt: 5 }, $or: [
        { status: 'pending', nextAttemptAt: { $lte: new Date() } },
        { status: 'sending', leaseUntil: { $lt: new Date() } },
      ] }, { $set: { status: 'sending', leaseUntil: new Date(Date.now() + 90000) }, $inc: { attempts: 1 } }, { new: true });
      if (!job) break;
      try {
        const request = await RequestModel.findById(job.requestId).lean();
        if (!request || request.demo) throw new Error('La solicitud no admite envío');
        const to = config.DEMO_MODE === 'true' ? config.EMAIL_REDIRECT_TO : job.role === 'business' ? config.ORDER_NOTIFICATION_TO : request.contact.email;
        const result = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(20000), headers: {
          Authorization: `Bearer ${config.EMAIL_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `ellas-${job._id}`,
        }, body: JSON.stringify({ from: config.EMAIL_FROM, to: [to], subject: `${config.DEMO_MODE === 'true' ? '[DEMO] ' : ''}${job.role === 'customer' ? 'Confirmación' : 'Nueva solicitud'} ${request.number}`, text: body(request, job.role === 'customer') }) });
        const payload = await result.json() as { id?: string; message?: string };
        if (!result.ok || !payload.id) throw new Error(`Proveedor HTTP ${result.status}: ${(payload.message || 'Sin identificador').slice(0,250)}`);
        await EmailModel.updateOne({ _id: job._id }, { $set: { status: 'sent', providerId: payload.id, sentAt: new Date(), lastError: '' }, $unset: { leaseUntil: 1 } });
      } catch (error) {
        const final = job.attempts >= 5;
        await EmailModel.updateOne({ _id: job._id }, { $set: { status: final ? 'failed' : 'pending', lastError: error instanceof Error ? error.message.slice(0,400) : 'Error del proveedor', nextAttemptAt: new Date(Date.now() + 60000 * 2 ** job.attempts) }, $unset: { leaseUntil: 1 } });
        console.error(JSON.stringify({ event: 'email_failed', job: String(job._id), attempt: job.attempts, final }));
      }
    }
  } finally { running = false; }
}
