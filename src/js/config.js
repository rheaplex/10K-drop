const projectName        = "10K Drop";
const projectDescription = "A 10K drop that you can own as an NFT. Locked until ETH hits 10KUSD.";
const author             = "Rhea Myers";

const edition            = 200;
const firstId            = 0;
const ap                 = 10;
const apPrefix           = "AP ";

const width              = 7680;
const height             = 4320;
const varianceMin        = width / 3;
const varianceMax        = width / 2;
const variance           = varianceMax - varianceMin;
const fontSizeBase       = height / 1.8;

const thumbnailSize      = 3000;

// The clue is in the project name.
const numKs              = 10;

// How long to run the physics before stopping and/or saving.
const renderTimeSeconds  = 45;
const numTicks           = renderTimeSeconds * 50;

module.exports = {
  projectName,
  projectDescription,
  author,

  edition,
  firstId,
  ap,
  apPrefix,

  numKs,

  width,
  height,
  varianceMin,
  varianceMax,
  variance,
  fontSizeBase,

  renderTimeSeconds,
  numTicks,

  thumbnailSize,
};
