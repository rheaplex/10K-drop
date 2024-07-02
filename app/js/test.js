/* global createBounds createEngine createKs createPrng
   ctx engine fetchFonts genStyles id init ks random renderPreview ticks
   HEIGHT NUM_KS WIDTH
   Composite URLSearchParams */

const DISPLAY_FOR = 2 * 1000;
const EDITION_SIZE = 1000;
let auto = false;

const showPreview = async () => {
  for(const e of document.getElementsByTagName('svg')) {
    e.parentNode.removeChild(e);
  }
  document.getElementById("currentEdition").value = id;
  const backgroundColour = await init();
  renderPreview(backgroundColour);
};

const next = () => {
  auto = false;
  if (id < EDITION_SIZE) {
    id++;
    showPreview();
  }
};

const previous = () => {
  auto = false;
  if (id > 0) {
    id--;
    showPreview();
  }
};

const toggle = () => {
  auto = ! auto;
  if (auto) {
    document.getElementById("next").disabled = true;
    document.getElementById("previous").disabled = true;
    document.getElementById("toggle").innerText = "Stop auto";
    autoAdvance();
  } else {
    document.getElementById("next").disabled = false;
    document.getElementById("previous").disabled = false;
    document.getElementById("toggle").innerText = "Start auto";
  }
};

const autoAdvance = () => {
  if (auto && (id < EDITION_SIZE)) {
    id++;
    showPreview();
    setTimeout(autoAdvance, DISPLAY_FOR);
  }
};

const updateCurrentEdition = (e) => {
  id = document.getElementById("currentEdition").value;
  showPreview();
};

(async () => {
  await fetchFonts();
  const params = new URLSearchParams(window.location.search);
  id = params.get("id") || 0;
  showPreview();
})();
