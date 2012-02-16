window.ws = null;

if (false) {
    var ZOOM = 20;
    var FIELDSIZE = 25;
} else {
    var ZOOM = 1;
    var FIELDSIZE = 750;

}

var FPS = 50;

var ACTION_TURN = 't';

$(document).ready( function(){

    // this is better
    // done loading

/*
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
*/
    var game = new Game;
    game.connect("192.168.56.1:27500");

    //simulation.field.test();


});

function User(id) {
    this.id = id;
}

function Game() {
    this.user = new User('kyle');
    this.players = [this.user];
    this.simulation = new Simulation(this);
    this.connection = null;
    this.id = '03298';
    var _this = this;
    $(document.body).keydown( function(evt) {
        return _this.simulation.keydown(evt);
    });

}
Game.prototype = {
    connect: function(address) {
        this.connection = new ServerConnection(this, address);
        this.connection.bind('connected', _.bind(this.connected, this));
        this.connection.connect();
    },
    connected: function() {
        console.log('connected to server!');
        //this.simulation.start();
    },
    send: function(msg) {
        this.connection.send( msg )
    },
    handle_action: function(data) {
        if (data.a == ACTION_TURN) {
            if (data.p == this.user.id) {
                // own user moving
                var mover = this.simulation.movers[ this.user.id ]
                mover.turn(data.d);

            } else {
                // find the other user
                debugger;
            }
        }
    }
};

function ServerConnection(game, address) {
    this.game = game;
    this.address = address;
    this._connected_ever = false;
    this._connected = false;
    this.ws = null;
    this._callbacks = {};
}
ServerConnection.prototype = {
    bind: function(event, callback) {
        if (! this._callbacks[event]) {
            this._callbacks[event] = [];
        }
        this._callbacks[event].push(callback);
    },
    trigger: function(event) {
        if (this._callbacks[event]) {
            for (var i=0; i<this._callbacks[event].length; i++) {
                setTimeout( this._callbacks[event][i], 1 ); // "defer"
            }
        }
    },
    reconnect: function() {
        this.connect();
    },
    connect: function() {
        var addr = 'ws://' + this.address + '/ws/game?id=' + encodeURIComponent(this.game.id) +
            '&user=' + encodeURIComponent(this.game.user.id);
        if (this.token) {
            addr = addr + '&token=' + encodeURIComponent(this.token);
        }
        this.ws = new WebSocket(addr);
        this.ws.onopen = _.bind(this.connected, this);
        this.ws.onclose = _.bind(this.disconnected, this);
        this.ws.onmessage = _.bind(this.onmessage, this);
    },
    connected: function() {
        console.log('connected to', this.address);
        this._connected = true;
        this._connected_ever = true;
        this.trigger('connected')

    },
    disconnected: function(evt) {
        this._connected = false;
        if (this._connected_ever) {
            console.error('disconnected from server');
            // XXX fix
            setTimeout( _.bind(this.reconnect, this), 1000 );

        } else {
            console.error('could not connect to server',this.address,evt);
        }
    },
    onmessage: function(evt) {
        var data = $.parseJSON(evt.data);
        console.log('got data from server',data);

        if (data.game) {
            this.game.simulation.start();
        } else if (data.a) {
            if (data.a == ACTION_TURN) {
                this.game.handle_action(data);
            } else {
                console.log('unhandled action',data.a);
                debugger;
            }
        }
    },
    send: function(data) {
        data['token'] = this.token;
        this.ws.send( $.toJSON(data) );
    }
};

function Simulation(game) {
    this.game = game;
    this.field = new Field(this);
    this.fps = FPS;
    this.reset();
}

Simulation.prototype = {
    keydown: function(evt) {
        if (evt.which == 72) {
            // left
            this.game.send( {a:'t',d:-1} );

            //this.current_mover.turn(-1);
        } else if (evt.which == 83) {
            //this.current_mover.turn(1);

            this.game.send( {a:'t',d:1} );
            //right 
        }



        var fourkeys = true;
        if (fourkeys) {
            var mover = this.movers[2]

            if (evt.which == 188) {
                // up

                if (mover.angle == 0) {
                    mover.turn(-1);
                } else if (mover.angle == 2) {
                    mover.turn(1);
                }

            } else if (evt.which == 79) {
                // down
                if (mover.angle == 0) {
                    mover.turn(1);
                } else if (mover.angle == 2) {
                    mover.turn(-1);
                }


            } else if (evt.which == 65) {
                // left
                if (mover.angle == 1) {
                    mover.turn(1);
                } else if (mover.angle == 3) {
                    mover.turn(-1);
                }

            } else if (evt.which == 69) {
                // right
                if (mover.angle == 1) {
                    mover.turn(-1);
                } else if (mover.angle == 3) {
                    mover.turn(1);
                }

            }

        } else {
            // player 2
            if (evt.which == 65) {
                this.movers[2].turn(-1);
            } else if (evt.which == 85) {
                this.movers[2].turn(1);
            }
        }

    },
    reset: function() {
        this.movers = {}
        mover1 = new Mover(this.field);
        mover1.id = this.game.user.id;


        this.movers[mover1.id] = mover1;

        mover2 = new Mover(this.field);
        mover2.id = 2;
        mover2.color = [255,0,0];
        mover2.y = this.field.height - mover2.size*2;
        //mover2.y = mover2.size * 4;
        mover2.y

        this.movers[mover2.id] = mover2;

        this.current_mover = this.movers[0];
    },
    update: function() {
        for (var id in this.movers) {
            this.movers[id].update();
        }
    },
    start: function() {
        this.tick();
    },
    tick: function() {
        this.update();
        setTimeout( _.bind(this.tick, this), 1000/this.fps );
    }
};

function Field(simulation) {
    this.simulation = simulation;
    this.width = FIELDSIZE;
    this.height = this.width;
    var canvas = document.createElement('canvas');
    $(canvas).attr('width',this.width);
    $(canvas).attr('height',this.height);
    $(canvas).css('width',(this.width * ZOOM) + 'px');
    //$(canvas).css('width','70%');
    //$(canvas).css('height','100%');
    var ctx = canvas.getContext('2d');
    this.ctx = ctx;
    //$(canvas).css('width', this.width);
    //$(canvas).css('height', this.height);
    document.body.appendChild( canvas );
    this.clear();
}

Field.prototype = {
    clear: function() {
        this.bgcolor = [200,255,128];
        this.ctx.fillStyle="rgb("+this.bgcolor.join(',')+")";
        this.ctx.fillRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);
    }
}


function Mover(field, x, y) {
    this.field = field;
    this.size = 10;
    this.color = [0,255,0];
    this.x = x || this.size;
    this.y = y || this.size;
    this.angle = 0;
    //this.vel = this.size / 4;
    this.vel = 3;
    this.dead = false;
}
Mover.prototype = {
    update: function() {
        if (this.dead) { return; }
        var dx = Math.cos( this.angle / 2 * Math.PI );
        var dy = Math.sin( this.angle / 2 * Math.PI );
        this.move( this.x + dx * this.vel,
                   this.y + dy * this.vel );
    },
    turn: function(dir) {
        this.angle = (this.angle + dir) % 4;
        // javascript -1 % 4 -> -1
        if (this.angle < 0) {
            this.angle += 4;
        }
    },
    pixel_match_fn: function(pixel) {
        for (var i=0; i<3; i++) {
            if (this.field.bgcolor[i] != pixel[i]) {
                return true;
            }
        }
        return false;
    },
    will_hit: function() {
        // determines if next update will cause snake to run into non-background
        // x,y is the topleft pixel.

        // needs to scan entire forward facing pixels
        var x,y,w,h;
        if (this.angle == 0) {
            // right
            x = this.x + this.size;
            y = this.y;
            w = 1;
            h = this.size;
        } else if (this.angle == 1) {
            // down
            x = this.x;
            y = this.y + this.size;
            w = this.size;
            h = 1
        } else if (this.angle == 2) {
            // left
            x = this.x - 1;
            y = this.y;
            w = 1;
            h = this.size;
        } else if (this.angle == 3) {
            // up
            x = this.x;
            y = this.y - 1;
            w = this.size;
            h = 1;
        }

        // determine if fn matches in ctx at x,y,w,h
        var img = this.field.ctx.getImageData(x,y,w,h);
        for (var i=0; i<img.data.length; i+=4) {
            var pixel = [ img.data[0], img.data[1], img.data[2], img.data[3] ];
            if (this.pixel_match_fn(pixel)) {
                return true;
            }
        }
        return false;


        //var hit = one_matches_in_box( this.field.ctx, x,y,w,h, this.pixel_match_fn);
        //return hit;
    },
    lookahead: function(x,y) {
        var dx = Math.cos( this.angle / 2 * Math.PI );
        var dy = Math.sin( this.angle / 2 * Math.PI );
        return [this.x + dx, this.y + dy];
    },
    move: function(x,y) {
        //console.log('move to',x,y);
/*
        var ahead = this.lookahead();
        //console.log('at',[this.x,this.y], 'lookahead',ahead);
        var hit = this.detect(ahead[0],ahead[1]); // detect if would kill
*/


        var hit = this.will_hit();
        if (hit) {
            console.log('mover',this.id,'died!')
            this.dead = true;
            //this.field.reset();
        }

        var ctx = this.field.ctx;
        var img = ctx.createImageData(this.size, this.size);



        for (var i=0; i<img.data.length; i+=4) {
            // lighten it toward the center in the direction of travel
            img.data[i] = this.color[0];
            img.data[i+1] = this.color[1];
            img.data[i+2] = this.color[2];
            img.data[i+3] = 255;
        }
        //console.log('put img data at',x,y);
        ctx.putImageData( img, Math.floor(x),Math.floor(y) );


        this.x = x;
        this.y = y;
    },
    detect: function(x,y) {
        var imgd = this.field.ctx.getImageData(x, y, 1, 1);
        var pix = imgd.data;
        //console.log('detect at',x,y,[pix[0],pix[1],pix[2]]);
        
        for (var i=0; i<3; i++) {
            if (this.field.bgcolor[i] != pix[i]) {
                return true;
            }
        }

    }
}