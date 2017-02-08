const Writable = require('stream').Writable;
const util = require('util');
const DSP = require('./dsp.min.js');

let bitDepth,
    channels,
    signed,
    sampleRate,
    fftSize,
    emitter,
    fft;

let self;

var fftWriter = function (format, size)
{
    bitDepth = format.bitDepth;
    channels = format.channels;
    signed = format.signed;
    sampleRate = format.sampleRate;
    
    fftSize = size;

    fft = new DSP.FFT(fftSize, sampleRate);

    Writable.call(this, 
        { 
            objectMode: true
        });
    
    self = this;
/*    setTimeout(function () 
        {
            this.end();
        }, 16000);*/
}
module.exports = fftWriter;
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

let current = [];
let left = [];
fftWriter.prototype._write = function(chunk, encoding, callback)
{
    left = createSourceBuffer(chunk);
    while (left.length > 0)
    {
        //console.log(`Read ${current.length} - ${left.length}`)
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
                left = [];
            }                
            //console.log(current.length + "-" + left.length);
        }
        else
        {                
            var filler = createEmptyBuffer(Math.min(fftSize, current.length + left.length));
            var fillLength = filler.length - current.length;
            filler.set(current);
            filler.set(left.slice(0, fillLength), current.length);
            left = left.slice(fillLength);
            current = filler;
            //console.log(current.length + "-" + left.length);
        }
        
        if (current.length == fftSize)
        {
            var totalEnergy = 0;
            for (var i = 0; i < fftSize; i++)
            {
                totalEnergy += Math.abs(current[i]);
            }
            fft.forward(current);
            var retVal = fft.spectrum;
            self.emit('fft', 
            {
                fft: retVal,
                total: totalEnergy
            });
        }
    }
    callback();
};
