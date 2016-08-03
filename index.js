var express = require('express'),
    http = require('http'),
    redis = require('redis'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    publisherClient = redis.createClient();

var app = module.exports = express();

http.createServer(app).listen(9000, '0.0.0.0');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method'));          // Microsoft
app.use(methodOverride('X-HTTP-Method-Override')); // Google/GData
app.use(methodOverride('X-Method-Override'));      // IBM
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.render('index');
});

app.get('/sse', function(req, res) {
    var messageCount = 0;
    var subscriber = redis.createClient();
    req.setTimeout(0);

    setTimeout(function() {
        subscriber.unsubscribe();
        subscriber.quit();
        res.write('id: ' + messageCount + '\n');
        res.write('retry: ' + 30 * 1000 +'\n');
        res.end();
    }, 10 * 1000);
    subscriber.subscribe("sse:updates");
    subscriber.on("error", function(err) {
        console.log("Redis Error: " + err);
    });
    subscriber.on("message", function(channel, message) {
        messageCount++;
        res.write('id: ' + messageCount + '\n');
        res.write("data: " + message + '\n\n');
    });
    res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write('\n');
    req.on("close", function() {
        subscriber.unsubscribe();
        subscriber.quit();
    });
});

app.get('/fire/:event_name', function(req, res) {
    publisherClient.publish( 'sse:updates', JSON.stringify({ pageVisited: req.params.event_name }));
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('All clients have received "' + req.params.event_name + '"');
    res.end();
});
