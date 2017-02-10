const d3 = require('d3');
//const $ = require('jQuery');
const EventEmitter = require('events').EventEmitter;
const util = require('util');

var currentTime = -1;
var currentSelected = -1;
var chartGroup;

var self; // context reference

var chordChart = function(data, destination)
{
    EventEmitter.call(this);
    this.createChord(data, destination);
    self = this;
}

util.inherits(chordChart, EventEmitter);
module.exports = chordChart;

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

chordChart.prototype.click = function(eventFunction)
{
    clickEvent = eventFunction;
}

chordChart.prototype.createChord = function (data, destination)
{
    // var matrix = createTimeMatrix(data, 1);
    //var ribbonMatrix = createRibbonMatrix(data);
    var matrix = [];
    for (var a = 0; a < data.total; a++)
    {
        matrix.push(1);
    }
    
    var pie = d3.pie()(matrix);
    var ribbonGroups = [];

    for (var b = 0; b < data.groups.length; b++)
    {
        var time1 = Math.round(data.groups[b].time1);
        var time2 = Math.round(data.groups[b].time2);
        var time1obj = pie[time1];
        var time2obj = pie[time2];
        ribbonGroups.push(
            {
                source: time1obj,
                target: time2obj
            }
        )
    }
    
    var svg = d3.select(destination),
        bbox = svg.node().getBBox(),
        width = +svg.attr("width"),
        height = +svg.attr("height"),
        outerFirstRadius = Math.min(width, height) * 0.5 - 10,
        innerFirstRadius = outerFirstRadius - 20,
        outerRadius = outerRadius = innerFirstRadius - 2,
        innerRadius = outerRadius - 10;

    svg.selectAll(`*`).remove();

    var formatValue = d3.formatPrefix(",.0", 1e3);

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
        .datum(function() { return pie; });

    var group = g.append("g")
        .attr("class", "groups")
        .selectAll("g")
        .data(function() { return pie; })
        .enter().append("g");

    group.append("path")
        .style("fill", function(d, index) { return color(index); })
        .style("stroke", function(d, index) { return d3.rgb(color(index)).darker(); })
        .attr("d", firstArc)
        .attr("class", "outer-group")
        .style("opacity", 0);

    var setOpacity = function (g, idx, mouseOver)
        {
            currentSelected = (mouseOver) ? idx : -1;

            var ribbonGroup = svg.selectAll(".ribbon-group");
            ribbonGroup.style("opacity", (mouseOver ? 0.4 : 0.8))

            var innerGroups = group.selectAll(".inner-group");
            innerGroups.style("opacity", (mouseOver ? 0.5 : 1));
            innerGroups
                .filter(function (d) { return (d.index == currentSelected); })
                .style("opacity", 1);
            
            var outerGroup = group
              .selectAll('.outer-group')              
              .filter(function (d) { return (d.index != currentTime); })
              .style("opacity", 0);
            group.selectAll(".outer-group")
                 .filter(function (d) { return (d.index == currentSelected); })
                 .style("opacity", 0.8);
        }

    group.append("path")
        .style("fill", function(d, index) { return color(index); })
        .style("stroke", function(d, index) { return d3.rgb(color(index)).darker(); })
        .attr("d", arc)
        .attr("class", "inner-group")
        .on("mouseover", function(group, index) { setOpacity(group, index, true) })
        .on("mouseout", function(group, index) { setOpacity(group, index, false) })
        .on("click", function (group, index) { self.emit('click', index); });

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
        .data(ribbonGroups)
        .enter()
        .append("path")
        .attr("d", ribbon)
        .attr("class", "ribbon-group")
        .style("fill", function(d, index) { return color(index); })
        .style("stroke", function(d, index) { return d3.rgb(color(index)).darker(); })
        .style("opacity", 0.8);

    // Returns an array of tick angles and values for a given group and step.
    function groupTicks(d, step) {
        var k = (d.endAngle - d.startAngle) / d.value;
        return d3.range(0, d.value, step).map(function(value) {
            return {value: value, angle: value * k + d.startAngle};
        });
    }

    chartGroup = group;
}

chordChart.prototype.setChartTime = function(idx)
{
    currentTime = idx;
    var outerGroup = chartGroup
              .selectAll('.outer-group')
              .filter(function (d) { return (d.index != currentSelected);})
              .style("opacity", 0);
    chartGroup.selectAll('.outer-group')
              .filter(function (d) { return (d.index == currentTime);})
              .style("opacity", 1);
}