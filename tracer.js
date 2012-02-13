window.ws = null;

$(document).ready( function(){

    console.log('hi');
    // this is better
    // done loading

    ws = new WebSocket("ws://192.168.56.1:27500/ws/game");
    ws.onopen = function() {
        console.log('ws opened');
        ws.send("Hello, world");
    };
    ws.onmessage = function (evt) {
        console.log('got msg',evt.data);
    };
    ws.onclose = function(evt) {
        console.log('ws closed',evt);
        // re-attempt open
    }
    ws.onerror = function(evt) {
        console.log('ws error',evt);
    }


    var simulation = new Simulation;
    simulation.start();
    //simulation.field.test();

    $(document.body).keydown( function(evt) {
        return simulation.keydown(evt);
    });

});



function Simulation() {
    this.field = new Field();
    this.fps = 60;
    this.reset();

}

Simulation.prototype = {
    keydown: function(evt) {
        console.log(evt.which);
        if (evt.which == 37) {
            // left
            this.current_mover.angle--;
        } else if (evt.which == 39) {
            this.current_mover.angle++;
            //right 
        }
    },
    reset: function() {
        this.movers = [ new Mover(this.field) ];
        this.current_mover = this.movers[0];
    },
    update: function() {
        for (var i=0; i<this.movers.length; i++) {
            this.movers[i].update();
        }
    },
    start: function() {
        this.tick();
    },
    tick: function() {
        this.update();
        setTimeout( _.bind(this.tick, this), 1000/this.fps );
    }
}

function Field() {
    this.width = 400;
    this.height = 400;
    var canvas = document.createElement('canvas');
    $(canvas).attr('width',this.width);
    $(canvas).attr('height',this.height);
    var ctx = canvas.getContext('2d');
    this.ctx = ctx;
    this.bgcolor = [200,255,0];
    this.ctx.fillStyle="rgb("+this.bgcolor.join(',')+")";
    //$(canvas).css('width', this.width);
    //$(canvas).css('height', this.height);
    document.body.appendChild( canvas );
    this.reset();

}

Field.prototype = {
    reset: function() {
        this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);
    },
    test: function() {
        console.log('draw test');
        var ctx = this.ctx;
        ctx.fillStyle = "red";  
        ctx.beginPath();  
        ctx.moveTo(30, 30);  
        ctx.lineTo(150, 150);  
        ctx.fill();  
        ctx.fillStyle = "rgba(0, 0, 200, 0.5)";  
        ctx.fillRect (30, 30, 55, 50);  
        ctx.strokeWidth = 1;
        ctx.beginPath();  
        ctx.moveTo(30, 30);  
        ctx.lineTo(150, 150);  
        // was: ctx.quadraticCurveTo(60, 70, 70, 150); which is wrong.  
        //ctx.bezierCurveTo(60, 70, 60, 70, 70, 150); // <- this is right formula for the image on the right ->  
        //ctx.lineTo(50,80);
        //ctx.lineTo(30, 30);  
        //ctx.fill();  
        ctx.stroke();
    }
}

function Mover(field, x, y) {
    this.field = field;
    this.x = x || 10;
    this.y = y || 10;
    this.angle = 0;
    this.vel = 1;
}
Mover.prototype = {
    update: function() {
        var dx = Math.cos( this.angle / 2 * Math.PI );
        var dy = Math.sin( this.angle / 2 * Math.PI );
        this.move( this.x + dx * this.vel,
                   this.y + dy * this.vel );
    },
    move: function(x,y) {
        //console.log('move to',x,y);
        this.field.ctx.lineWidth = 1;
        this.field.ctx.fillStyle="black";
        this.field.ctx.beginPath();
        this.field.ctx.moveTo(this.x,this.y);

        var hit = this.detect(x,y); // detect if would kill

        if (hit) {
            alert('dead!');
            this.filed.reset();
        }

        this.field.ctx.lineTo(x,y);
        //this.field.ctx.closePath();
        this.field.ctx.stroke();
        this.x = x;
        this.y = y;
    },
    detect: function(x,y) {
        var imgd = this.field.ctx.getImageData(x, y, 1, 1);
        var pix = imgd.data;
        
        for (var i=0; i<3; i++) {
            if (this.field.bgcolor[i] != pix[i]) {
                return true;
            }
        }

    }
}