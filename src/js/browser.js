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
