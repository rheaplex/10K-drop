const projectName        = "10K Drop";
const projectDescription = "A 10K drop.";

const edition            = 200;
const firstId            = 0;

const width              = 7680;
const height             = 4320;
const varianceMin        = width / 6;
const varianceMax        = width / 3;
const variance           = varianceMax - varianceMin;
const fontSizeBase       = height / 1.6;

const thumbnailSize      = 3000;

// The clue is in the project name.
const numKs              = 10;

// How long to run the physics before stopping and/or saving.
const renderTimeSeconds  = 45;
const numTicks           = renderTimeSeconds * 50;

module.exports = {
  projectName,
  projectDescription,

  edition,
  firstId,

  numKs,

  width,
  height,
  varianceMin,
  varianceMax,
  variance,
  fontSizeBase,

  renderTimeSeconds,
  numTicks,

  thumbnailSize
};
