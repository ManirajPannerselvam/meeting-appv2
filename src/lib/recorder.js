let mediaRecorder, chunks = [];

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  chunks = [];
  mediaRecorder.ondataavailable = e => chunks.push(e.data);
  mediaRecorder.start();
}

export function stopRecording() {
  return new Promise(resolve => {
    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
    mediaRecorder.stop();
  });
}