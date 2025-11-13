import { connect } from "./connection.js";
import { sendMail } from "../services/emailService.js";
import { getIO } from "../socket/socketServer.js"

export async function startConsumer() {
  const { channel } = await connect();
  const exchange = process.env.RABBITMQ_EXCHANGE || "events";
  const inviteQueue = process.env.RABBITMQ_QUEUE_EMAIL || "notifications.email";
  const otpQueue = process.env.RABBITMQ_QUEUE_OTP || "notifications.otp";
  const inviteKey = process.env.RABBITMQ_ROUTE_INVITE || "user.invite.created";
  const otpKey = process.env.RABBITMQ_ROUTE_OTP || "user.otp.send";
  const realtimeQueue=process.env.RABBITMQ_QUEUE_REALTIME || "notifications.realtime"
  const realtimeKey=process.env.RABBITMQ_QUEUE_REALTIME||"invitation.*"
  await channel.assertQueue(inviteQueue, { durable: true });
  await channel.assertQueue(otpQueue, { durable: true });
  await channel.assertQueue(realtimeQueue,{durable:true})

  await channel.bindQueue(inviteQueue, exchange, inviteKey);
  await channel.bindQueue(otpQueue, exchange, otpKey);
  await channel.bindQueue(realtimeQueue,exchange,realtimeKey)

  console.log(" Consumers ready for Invitations and OTP emails...");
  channel.consume(inviteQueue, async (msg) => {
    if (!msg) return;
    try {
      const body = JSON.parse(msg.content.toString());
      const data = body.data || body;

      const link = `http://localhost:3000/register?invitationId=${data.invitationId}&code=${data.code}`;
      const html = `
        <h2>You are invited to join!</h2>
        <p>Click below to complete registration:</p>
        <a href="${link}" target="_blank">Register Now</a>
        <p><b>Role:</b> ${data.role}</p>
        <p><b>Expires at:</b> ${new Date(data.expiresAt).toLocaleString()}</p>
      `;

      await sendMail({
        to: data.email,
        subject: "You're invited to join!",
        text: `Click the link to register: ${link}`,
        html,
      });

      channel.ack(msg);
      console.log("Invitation email sent to", data.email);
    } catch (err) {
      console.error("Invitation consumer error:", err);
      channel.nack(msg, false, false);
    }
  });

  channel.consume(otpQueue, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      console.log(" Received OTP message:", data);

      await sendMail({
        to: data.email,
        subject: data.subject || "Your OTP Code",
        text: `Your OTP is: ${data.otp}`,
        html: `<p>Your OTP code is <b>${data.otp}</b>. It is valid for 5 minutes.</p>`,
      });

      channel.ack(msg);
      console.log(" OTP email sent to", data.email);
    } catch (err) {
      console.error(" OTP consumer error:", err);
      channel.nack(msg, false, false);
    }
  });
  channel.consume(realtimeQueue,(msg)=>{
    if(!msg?.content){
      return;
    }
    try{
      const data=JSON.parse(msg.content.toString());
      const io=getIO();
      console.log("realtime recevide:",data);
      io.emit("notification",{
        message:data.message,
        email:data.email,
        type:data.type,
      });
      channel.ack(msg)
    }catch(err){
      console.error("realtime consumer error",err);
      channel.nack(msg,false,false);
    }
  })
}

