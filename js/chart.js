const d3 = require('d3');
const $ = require('jQuery');

function createTimeMatrix(data, fill)
{
    if (!fill) fill = 1;
    var retMatrix = [];
    var length = data.total;
    for (var a = 0; a < length; a++)
    {
        var dimension = [];
        for (var b = 0; b < length; b++)
        {
            dimension.push(fill);
        }
        retMatrix.push(dimension);
    }
    return retMatrix;
}

function createRibbonMatrix(data)
{
    var retMatrix = createTimeMatrix(data, 0.5);    
    var groups = data.groups;

    for (var i = 0; i < groups.length; i++)
    {
        var time1 = Math.round(groups[i].time1);
        var time2 = Math.round(groups[i].time2);
        retMatrix[time1][time2] = 1;
        retMatrix[time2][time1] = 1;
    }

    return retMatrix;
}

function createChord(data, destination)
{
    var matrix = createTimeMatrix(data, 1);
    //var ribbonMatrix = createRibbonMatrix(data);
    
    var svg = d3.select(destination),
        width = +svg.attr("width"),
        height = +svg.attr("height"),
        outerFirstRadius = Math.min(width, height) * 0.5 - 10,
        innerFirstRadius = outerFirstRadius - 20,
        outerRadius = outerRadius = innerFirstRadius - 2,
        innerRadius = outerRadius - 10;

    var formatValue = d3.formatPrefix(",.0", 1e3);

    var filterValue = function(datum, idx)
    {        
        var groups = data.groups;
        for (var i = 0; i < groups.length; i++)
        {
            var time1 = Math.round(groups[i].time1);
            var time2 = Math.round(groups[i].time2);
            if (datum.source.index == time1 && datum.target.index == time2) return true;
        }
        return false;
    }

    var chord = d3.chord()
            .padAngle(0.01);

    var firstArc = d3.arc()
            .innerRadius(outerFirstRadius)
            .outerRadius(innerFirstRadius);

    var arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius);

    var ribbon = d3.ribbon()
        .radius(innerRadius);

    var color = d3.scaleOrdinal()
        .domain(d3.range(4))
        .range(["#2E3D49", "#23527C", "#02B3E4", "#337AB7"]);
    
/*    var color = function(pos) 
    { 
        var colorPos = pos * Math.round(Math.random() * 3 + 1) - 1;
        return d3.schemeCategory20c[colorPos];
    }*/

    var g = svg.append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
        .datum(chord(matrix));

    var group = g.append("g")
        .attr("class", "groups")
        .selectAll("g")
        .data(function(chords) { return chords.groups; })
        .enter().append("g");

    group.append("path")
        .style("fill", function(d) { return color(d.index); })
        .style("stroke", function(d) { return d3.rgb(color(d.index)).darker(); })
        .attr("d", firstArc)
        .attr("class", "outer-group")
        .style("opacity", 0);

    group.append("path")
        .style("fill", function(d) { return color(d.index); })
        .style("stroke", function(d) { return d3.rgb(color(d.index)).darker(); })
        .attr("d", arc);

/*    var groupTick = group.selectAll(".group-tick")
        .data(function(d) { return groupTicks(d, 1e3); })
        .enter().append("g")
        .attr("class", "group-tick")
        .attr("transform", function(d) { return "rotate(" + (d.angle * 180 / Math.PI - 90) + ") translate(" + outerRadius + ",0)"; });
*/
/*    groupTick.append("line")
        .attr("x2", 6);*/

/*    groupTick
        .filter(function(d) { return d.value % 5e3 === 0; })
        .append("text")
        .attr("x", 8)
        .attr("dy", ".35em")
        .attr("transform", function(d) { return d.angle > Math.PI ? "rotate(180) translate(-16)" : null; })
        .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
        .text(function(d) { return formatValue(d.value); });*/

    g.append("g")
        .attr("class", "ribbons")
        .selectAll("path")
        .data(function(chords) { return chords; })
        .enter().append("path")
        .filter(function(data, idx) { return filterValue(data, idx); })
        .attr("d", ribbon)
        .style("fill", function(d) { return color(d.target.index); })
        .style("stroke", function(d) { return d3.rgb(color(d.target.index)).darker(); });

    // Returns an array of tick angles and values for a given group and step.
    function groupTicks(d, step) {
        var k = (d.endAngle - d.startAngle) / d.value;
        return d3.range(0, d.value, step).map(function(value) {
            return {value: value, angle: value * k + d.startAngle};
        });
    }

    return group;
}

function setChartTime(chartGroup, idx)
{
    var outerGroup = chartGroup.selectAll(".outer-group");

    outerGroup.style("opacity", 0);
    outerGroup.filter(function (d) { return (d.index == idx);})
              .style("opacity", 1);
}

module.exports = 
{
    createChord: createChord,
    setChartTime: setChartTime
}