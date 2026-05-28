export async function getUserMedia(constraints = { video: true, audio: true }) {
  return navigator.mediaDevices.getUserMedia(constraints);
}

export async function getDisplayMedia() {
  return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
}

export function stopStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

export async function createPeer(initiator, stream) {
  const SimplePeer = (await import('simple-peer')).default;
  return new SimplePeer({
    initiator,
    trickle: true,
    stream: stream || undefined,
  });
}
