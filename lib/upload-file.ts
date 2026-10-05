/**
 * PUT a file to a presigned URL, reporting progress.
 *
 * XMLHttpRequest rather than fetch, deliberately: fetch has no upload progress
 * event, and for a half-gigabyte file "is it working?" is the whole experience.
 * The URL carries all the authority, so there are no credentials here.
 */

export class UploadAborted extends Error {
  constructor() {
    super("Upload cancelled.");
    this.name = "UploadAborted";
  }
}

export function putFile(params: {
  url: string;
  file: File;
  contentType: string;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}): Promise<void> {
  const { url, file, contentType, onProgress, signal } = params;

  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new UploadAborted());
      return;
    }

    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", contentType);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(1);
        resolve();
      } else {
        reject(new Error(`The upload was refused (${request.status}). Try again.`));
      }
    };
    request.onerror = () =>
      reject(
        new Error("The upload was interrupted. Check your connection and try again."),
      );
    request.onabort = () => reject(new UploadAborted());

    signal.addEventListener("abort", () => request.abort(), { once: true });
    request.send(file);
  });
}
