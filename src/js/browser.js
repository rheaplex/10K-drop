/* global TextEncoder */

window.fetchUrl = async (file, prefix) => {
  const response = await fetch(`./${prefix}/${file}`);
  return await response.arrayBuffer();
};

window.createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  //document.body.appendChild(canvas);
  return canvas;
};

window.createHash = async plaintext => {
  const buffer = new Int8Array(1);
  buffer[0] = plaintext;
  return Array.from(
    new Uint8Array(
      await window.crypto.subtle.digest(
        "SHA-256",
        buffer
      )))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
};
