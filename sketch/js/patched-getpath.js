// MONKEYPATCH OPENTYPEJS

// https://github.com/opentypejs/opentype.js/blob/master/src/glyph.mjs#L144

opentype.Glyph.prototype.getPath = function(x, y, fontSize, options, font) {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    options = Object.assign({}, font && font.defaultRenderOptions, options);
    let commands;
    let hPoints;
    let xScale = options.xScale;
    let yScale = options.yScale;
    const scale = 1 / (this.path.unitsPerEm || 1000) * fontSize;

    let useGlyph = this;

    if(font && font.variation) {
        useGlyph = font.variation.getTransform(this, options.variation);
        commands = useGlyph.path.commands;
    }

    if (options.hinting && font && font.hinting) {
        // in case of hinting, the hinting engine takes care
        // of scaling the points (not the path) before hinting.
        hPoints = useGlyph.path && font.hinting.exec(useGlyph, fontSize, options);
        // in case the hinting engine failed hPoints is undefined
        // and thus reverts to plain rending
    }

    if (hPoints) {
        // Call font.hinting.getCommands instead of `glyf.getPath(hPoints).commands` to avoid a circular dependency
        commands = font.hinting.getCommands(hPoints);
        x = Math.round(x);
        y = Math.round(y);
        // TODO in case of hinting xyScaling is not yet supported
        xScale = yScale = 1;
    } else {
        commands = useGlyph.path.commands;
        if (xScale === undefined) xScale = scale;
        if (yScale === undefined) yScale = scale;
    }

    const p = new opentype.Path();
    if ( options.drawSVG ) {
        const svgImage = this.getSvgImage(font);
        if ( svgImage ) {
            const layer = new opentype.Path();
            layer._image = {
                image: svgImage.image,
                x: x + svgImage.leftSideBearing * scale,
                y: y - svgImage.baseline * scale,
                width: svgImage.image.width * scale,
                height: svgImage.image.height * scale,
            };
            p._layers = [layer];
            return p;
        }
    }
    if ( options.drawLayers ) {
        const layers = this.getLayers(font);
        if ( layers && layers.length ) {
            p._layers = [];
            for ( let i = 0; i < layers.length; i += 1 ) {
                const layer = layers[i];
                let color = getPaletteColor(font, layer.paletteIndex, options.usePalette);

                if ( color === 'currentColor' ) {
                    color = options.fill || 'black';
                } else {
                    color = formatColor(color, options.colorFormat || 'rgba');
                }
                options = Object.assign({}, options, {fill: color});
                p._layers.push(this.getPath.call(layer.glyph, x, y, fontSize, options, font));
            }
            return p;
        }
    }

    p.fill = options.fill || this.path.fill;
    p.stroke = options.stroke || this.path.stroke;
    p.strokeWidth = options.strokeWidth || this.path.strokeWidth * scale;
    for (let i = 0; i < commands.length; i += 1) {
        const cmd = commands[i];
        if (cmd.type === 'M') {
            p.moveTo(x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'L') {
            p.lineTo(x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'Q') {
            p.quadraticCurveTo(x + (cmd.x1 * xScale), y + (-cmd.y1 * yScale),
                x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'C') {
            p.curveTo(x + (cmd.x1 * xScale), y + (-cmd.y1 * yScale),
                x + (cmd.x2 * xScale), y + (-cmd.y2 * yScale),
                x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'Z' && p.stroke && p.strokeWidth) {
            p.closePath();
        }
    }

    return p;
};
