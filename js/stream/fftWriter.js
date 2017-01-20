const Writable = require('stream').Writable;
const util = require('util');
const DSP = require('./dsp.js');

var bitDepth,
    channels,
    signed,
    sampleRate,
    fftSize,
    emitter,
    fft;

var fftWriter = function (format, size)
{
    bitDepth = format.bitDepth;
    channels = format.channels;
    signed = format.signed;
    sampleRate = format.sampleRate;
    
    fftSize = size;

    fft = new DSP.FFT(fftSize, sampleRate);

    Writable.call(this, { objectMode: true });
}
util.inherits(fftWriter, Writable);

function createSourceBuffer(chunk)
{
    switch (bitDepth)
    {
        case 8:
            return (signed) ?
                new Int8Array(chunk.buffer) : new Uint8Array(chunk.buffer);
            break;
        case 16:
            return (signed) ?
                new Int16Array(chunk.buffer) : new Uint16Array(chunk.buffer);
            break;
        case 32:
            return (signed) ?
                new Int32Array(chunk.buffer) : new Uint32Array(chunk.buffer);
            break;
        default:
            return new Int16Array(chunk.buffer);
            break;
    }
};

function createEmptyBuffer(length)
{
    switch (bitDepth)
    {
        case 8:
            return (signed) ?
                new Int8Array(length) : new Uint8Array(length);
            break;
        case 16:
            return (signed) ?
                new Int16Array(length) : new Uint16Array(length);
            break;
        case 32:
            return (signed) ?
                new Int32Array(length) : new Uint32Array(length);
            break;
        default:
            return new Int16Array(length);
            break;
    }
};

var current;
fftWriter.prototype._write = function(chunk, encoding, callback)
{
    var left;
    left = createSourceBuffer(chunk);
    while (left.length > 0)
    {
        if (!current || current.length >= fftSize) 
        {
            if (left.length > fftSize) 
            {
                current = left.slice(0, fftSize);
                left = left.slice(fftSize);
            }
            else
            {
                current = left;
                left = {};
            }
        }
        else
        {
            var filler = createEmptyBuffer(Math.min(fftSize, current.length + left.length));
            var fillLength = filler.length - current.length;
            //console.log(`old buffer exists, filling ${fillLength}`);
            filler.set(current);
            filler.set(left.slice(0, fillLength), current.length);
            //current.push(left.slice(0, fillLength));
            left = left.slice(fillLength);
            current = filler;
        }
        
        if (current.length == fftSize)
        {
            fft.forward(current);
            var retVal = fft.spectrum;
            this.emit('fft', retVal);
        }
    }

    callback();
};

module.exports = fftWriter;