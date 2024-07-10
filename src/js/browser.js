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

window.createHash = async plaintext => Array.from(
  new Uint8Array(
    await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(plaintext)
    )))
  .map((item) => item.toString(16).padStart(2, "0"))
  .join("");
