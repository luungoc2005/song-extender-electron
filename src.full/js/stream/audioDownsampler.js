const Transform = require('stream').Transform;
const util = require('util');

var format;

var AudioDownsampler = function(options)
{
    Transform.call(this, {objectMode: true});
    options.sampleRate /= 2;
    format = options;
};
util.inherits(AudioDownsampler, Transform);

module.exports = AudioDownsampler;

function createSourceBuffer(chunk)
{
    switch (format.bitDepth)
    {
        case 8:
            return (format.signed) ?
                new Int8Array(chunk.buffer) : new Uint8Array(chunk.buffer);
            break;
        case 16:
            return (format.signed) ?
                new Int16Array(chunk.buffer) : new Uint16Array(chunk.buffer);
            break;
        case 32:
            return (format.signed) ?
                new Int32Array(chunk.buffer) : new Uint32Array(chunk.buffer);
            break;
        default:
            return new Int16Array(chunk.buffer);
            break;
    }
};

function createDestBuffer(chunk)
{
    var length = chunk.length / (format.bitDepth / 8) / 2;
    switch (format.bitDepth)
    {
        case 8:
            return (format.signed) ?
                new Int8Array(length) : new Uint8Array(length);
            break;
        case 16:
            return (format.signed) ?
                new Int16Array(length) : new Uint16Array(length);
            break;
        case 32:
            return (format.signed) ?
                new Int32Array(length) : new Uint32Array(length);
            break;
        default:
            return new Int16Array(chunk.length / 4);
            break;
    }
};

AudioDownsampler.prototype._transform = function (chunk, encoding, callback)
{
    if (chunk.length === 0)
    {
        this.push(null);
        callback();
    }
    else if (chunk.length % 2 !== 0)
    {
        this.push(chunk);
        callback();
    }
    else
    {
        var source = new createSourceBuffer(chunk);
        var dest = new createDestBuffer(chunk);
        var pos = 0;
        for (var i = 0; i < source.length; i+=2)
        {
            dest[pos] = 0.5 * source[i] + 0.5 * source[i + 1];
            pos++;
        }
        var arr = Buffer.from(dest.buffer);
        this.push(arr);
        callback();
    }
};
