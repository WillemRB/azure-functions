var cheerio = require('cheerio');
var rp = require('request-promise');
var sendwithus = require('sendwithus');
var request = require('request');

var packtpub_url = 'https://www.packtpub.com';
var freelearning_url = '/packt/offers/free-learning';

var cookie_jar = request.jar();
var _context = 0;

module.exports = function (context, packtpubTimer) {
    _context = context;
    _request(freelearning_url, 'get')
        .then($ => {
            var $form = $('#packt-user-login-form');
            var data = $form
                .serializeArray()
                .reduce((prev, curr) => Object.assign(prev, { [curr.name]: curr.value }), {});

            data.email = process.env['PACKTPUB_USERNAME'];
            data.password = process.env['PACKTPUB_PASSWORD'];
            data.op = 'Login';

            return _request(freelearning_url, $form.attr('method'), data, { resolveWithFullResponse: true, transform: null, followRedirect: false });
        })
        .then(() => { throw new Error("Login failed!") })
        .catch(e => {
            if (e.response && e.response.headers && e.response.headers.location === 'https://www.packtpub.com/packt/offers/free-learning') {
                return _request(e.response.headers.location);
            }

            throw e;
        })
        .then($ => {
            _request($('.free-ebook a.twelve-days-claim').attr('href'))
                .then($ => {
                    var $book = $('#product-account-list .product-line').first()
                    var $cover = $book.find('.product-thumbnail img.imagecache-thumbview').first()

                    var data = {
                        title: $cover.attr('title'),
                        image: 'https:' + $cover.attr('src'),
                        pdf: $book.find('.fake-button[format="pdf"]').parent().attr('href'),
                        epub: $book.find('.fake-button[format="epub"]').parent().attr('href'),
                        date: ('0' + new Date().getDate()).slice(-2) + '-' + ('0' + (new Date().getMonth() + 1)).slice(-2) + '-' + new Date().getFullYear()
                    };

                    _context.log(data);
                    var mailer = sendwithus(process.env['SENDWITHUS_API_KEY']);

                    mailer.send({
                        template: 'tem_zsQKxXGvK2Y33qfdQQpMW7',
                        recipient: { address: process.env['SENDWITHUS_RECIPIENT'] },
                        template_data: data
                    }, sendwithus_callback);
                });
        });
}

function _request(uri, method, data, options) {
    method = method || 'get';
    data = data || {};
    options = options || {};

    if (uri.indexOf(packtpub_url) !== 0) {
        uri = packtpub_url + uri;
    }

    var _options = Object.assign({
        uri,
        jar: cookie_jar,
        transform: (body) => cheerio.load(body)
    }, options);

    if ('post' === method) {
        _options.method = 'post';
        _options.form = data;
    }

    _context.log('request', _options);

    return rp(_options)
}

var sendwithus_callback = function (err, response) {
    if (err) {
        _context.log(err.statusCode, response);
    } else {
        _context.log(response);
    }
    _context.done();
};
