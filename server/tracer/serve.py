import logging
from tornado import gen
import tornado.ioloop
import tornado.web
ioloop = tornado.ioloop.IOLoop.instance()
import logging
import functools
import tornado.websocket
import json
import tornado.options
import time
from tornado.options import define, options
define("debug", default = True, type = bool, help = "Tornado will reload on any file changes")
define("fake_latency", default = True, type = bool, help = "force server latency")
define("port", default=27500, type=int)

tornado.options.parse_command_line()
hexdigits = list('ABCDEF') + map(str,range(10))
import random
if options.debug:
    import pdb

class Game(object):
    instances = {}

    @classmethod
    def get(cls, id):
        if id not in cls.instances:
            cls.instances[id] = cls(id)
        return cls.instances[id]

    def __init__(self, id):
        self.id = id
        self._maxplayers = 4
        self._started = False
        self._players = {}
        
    def info(self):
        return { 'players': len(self._players),
                 'maxplayers': self._maxplayers,
                 'started': self._started }

    def handle_join(self, user):
        self._players[user] = None

    def broadcast(self, message):
        for player in self._players:
            if player.conn:
                player.conn.write( message )

class User(object):
    instances = {}

    @classmethod
    def get(cls, id):
        if id not in cls.instances:
            cls.instances[id] = cls(id)
        return cls.instances[id]

    def __repr__(self):
        return '<%s.User>' % self.id

    def __init__(self, id):
        self.id = id
        self.conn = None

    def set_connection(self, conn):
        self.conn = conn

class Field(object):
    def __init__(self, width):
        self.width = width

ACTION_TURN = 't'
    
class GameConnection(object):
    instances = {}

    @classmethod
    def get(cls, ws, user, game, token):
        # todo - reconnections
        cls.instances[user] = cls(ws, user, game, token)

        return cls.instances[user]

    def __init__(self, ws, user, game, token=None):
        self.ws = ws
        self.user = user
        self.user.set_connection(self)
        self.game = game
        self.game.handle_join(self.user)
        #self.token = ''.join([random.choice(hexdigits) for _ in range(8)])

    def handle_message(self, message):
        data = json.loads(message)
        logging.info('recv message from %s %s' % (self.user, data))
        if 'a' in data:
            action = data['a']

        if action == ACTION_TURN:
            data['p'] = self.user.id
            if options.fake_latency:
                ioloop.add_timeout( time.time() + 0.1, functools.partial( self.game.broadcast, data ) )
            else:
                self.game.broadcast( data )

    def write(self, message):
        if self.ws._closed:
            return logging.warn('tried to write to dead ws')
        self.ws.write(message)

class GameHandler(tornado.websocket.WebSocketHandler):

    def open(self):

        self._closed = False
        user = User.get(self.get_argument('user'))
        game = Game.get(self.get_argument('id'))
        logging.info('websocket open %s' % user)
        token = self.get_argument('token',None) # allows resume
        self.connection = GameConnection.get(self, user, game, token)
        data = { 'game': game.info() }
        self.write( data )

    def on_message(self, message):
        ioloop.add_callback( functools.partial( self.connection.handle_message, message ) )

    def on_close(self):
        self._closed = True
        logging.info('websocket close')

    def write(self, data):
        self.write_message( json.dumps(data) )

class BaseHandler(tornado.web.RequestHandler):
    pass

if __name__ == '__main__':
    routes =     [
        ('/ws/game', GameHandler),
        ('/foo.*', BaseHandler)
        ]
    settings = dict( (k, v.value()) for k,v in options.items() )
    application = tornado.web.Application(routes, **settings)
    application.listen(options.port)
    logging.info('listening on %s' % options.port)
    ioloop.start()
