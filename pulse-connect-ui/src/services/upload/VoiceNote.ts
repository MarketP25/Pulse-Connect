import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/config";

export async function uploadVoiceNote(file: File, listingId: string): Promise<string> {
  const storageRef = ref(storage, `voiceNotes/${listingId}/${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}