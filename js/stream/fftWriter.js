const Writable = require('stream').Writable;
const util = require('util');
const DSP = require('./dsp.js');

var bitDepth,
    channels,
    signed,
    sampleRate,
    fftSize,
    fft,
    emitter;

var fftWriter = function (format, size)
{
    Writable.call(this, {objectMode: true});

    bitDepth = format.bitDepth;
    channels = format.channels;
    signed = format.signed;
    sampleRate = format.sampleRate;

    fftSize = size;
    fft = new DSP.FFT(fftSize, format.sampleRate);
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
    var newLength = length / (bitDepth / 8) / 2;
    switch (bitDepth)
    {
        case 8:
            return (signed) ?
                new Int8Array(newLength) : new Uint8Array(newLength);
            break;
        case 16:
            return (signed) ?
                new Int16Array(newLength) : new Uint16Array(newLength);
            break;
        case 32:
            return (signed) ?
                new Int32Array(newLength) : new Uint32Array(newLength);
            break;
        default:
            return new Int16Array(length / 4);
            break;
    }
};

fftWriter.prototype._write = function(chunk, encoding, callback)
{
    var current, left;
    var buffer = createSourceBuffer(chunk);

    left = buffer;
    while ((current = left.slice(0, fftSize)) && left.length > 0)
    {
        left = left.slice(fftSize);
        if (current.length < fftSize) 
        {
            var filler = createEmptyBuffer(fftSize - current.length);
            Array.prototype.push.apply(current, filler);
        }
        fft.forward(current);
        //this.push(fft.spectrum);
        this.emit('fft', fft.spectrum);
    }
    callback();
};
module.exports = fftWriter;
