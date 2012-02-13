import logging
from tornado import gen
import tornado.ioloop
import tornado.web
ioloop = tornado.ioloop.IOLoop.instance()
import logging
import tornado.websocket
import tornado.options
from tornado.options import define, options
define("debug", default = False, type = bool, help = "Tornado will reload on any file changes")
define("port", default=27500, type=int)

tornado.options.parse_command_line()
if options.debug:
    import pdb

class GameHandler(tornado.websocket.WebSocketHandler):
    def open(self):
        logging.info('websocket open')
    def on_message(self, message):
        logging.info('recv message %s' % message)
        self.write_message(u'foobazbar!')
    def on_close(self):
        logging.info('websocket close')

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
