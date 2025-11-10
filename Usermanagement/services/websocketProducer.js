import {getIO} from "../socket/socketServer.js"
export function notifyInvitationAccepted(senderId,receiverName){
    const io=getIO()
    io.emit("invitationAccepted",{
        message:`${receiverName} accepted your invitation`,
        senderId,
    })
}
export function notifyLinkExpired(senderId, receiverName) {
  const io = getIO();
  io.emit("linkExpired", {
    message: `The invitation link sent to ${receiverName} has expired.`,
    senderId,
  });
}