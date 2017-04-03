var request = require('request');
var sendwithus = require('sendwithus');
var ironcache = require('iron-cache');
var rp = require('request-promise');
var cheerio = require('cheerio');

const base_url = 'https://www.mythicspoiler.com/';
const cache_name = 'magic-spoilers';

var client = ironcache.createClient();
var already_spoiled_count = 0;
var images = [];
var _context;

module.exports = function (context, spoilerTimer) {
    _context = context;
    _request().then($ => {
        const imgTags = $('img');
        
        for (i = 0; i < imgTags.length; i++) {
            var src = imgTags[i].attribs['src'];
            if (image.indexOf('/cards/') > 0) {
                images[images.length] = src;
            }
            if (images.length > 200) { break; }
        }

        processImages(images, [], function (err, new_cards) {
            if (new_cards.length > 0) {
                context.log(new_cards.length + ' new cards found');

                context.log('Sending mail...');
                var mailer = sendwithus(process.env['SENDWITHUS_API_KEY']);

                mailer.send({
                    template: process.env['MAIL_TEMPLATE_SPOILERS'],
                    recipient: { address: process.env['SENDWITHUS_RECIPIENT'] },
                    template_data: { cards: new_cards }
                }, function (err, response) {
                    context.log(response);
                    context.done();
                });

            }
            else {
                context.log('No new cards found...');
                context.done();
            }
        });
    });
}

function processImages(images, new_cards, callback) {
    if (images.length <= 0) {
        return callback(0, new_cards);
    }

    var image = images.shift();

    var cache_key = image.replace("/cards/", "-").replace(".jpg", "");
    var cache_value = Date.now();

    client.incr(cache_name, cache_key, 1, function (error, result) {
        if (result.value === 1) {
            new_cards.push({
                img: base_url + image,
                url: base_url + image.replace(".jpg", ".html")
            });
        }
        else {
            ++already_spoiled_count;
            _context.log('Card already in database: ' + image + ' (' + already_spoiled_count + ')');

            if (already_spoiled_count >= max_spoiled) {
                return callback(0, new_cards);
            }
        }

        processImages(images, new_cards, callback);
    });
}

function _request() {
    const _options = Object.assign({
        uri: base_url + 'newspoilers.html',
        transform: (body) => cheerio.load(body)
    });

    _context.log('request', _options);

    return rp(_options);
}
