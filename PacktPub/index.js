var request = require('request');
var cheerio = require('cheerio');
var rp = require('request-promise');
var sendwithus = require('sendwithus');

var packtpub_url = 'https://www.packtpub.com';
var freelearning_url = '/packt/offers/free-learning';

var cookie_jar = request.jar();

module.exports = function (context, packtpubTimer) {
    _request(freelearning_url, 'get')
        .then($ => {
            const $form = $('#packt-user-login-form');
            const data = $form
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
                    const $book = $('#product-account-list .product-line').first()
                    const $cover = $book.find('.product-thumbnail img.imagecache-thumbview').first()

                    const data = {
                        title: $cover.attr('title'),
                        image: 'https:' + $cover.attr('src'),
                        pdf: $book.find('.fake-button[format="pdf"]').parent().attr('href'),
                        epub: $book.find('.fake-button[format="epub"]').parent().attr('href'),
                        date: ('0' + new Date().getDate()).slice(-2) + '-' + ('0' + (new Date().getMonth() + 1)).slice(-2) + '-' + new Date().getFullYear()
                    };

                    const mailer = sendwithus(process.env['SENDWITHUS_API_KEY']);

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

    const _options = Object.assign({
        uri,
        jar: cookie_jar,
        transform: (body) => cheerio.load(body)
    }, options);

    if ('post' === method) {
        _options.method = 'post';
        _options.form = data;
    }

    console.log('request', _options);

    return rp(_options)
}

var sendwithus_callback = function (err, response) {
    if (err) {
        console.log(err.statusCode, response);
    } else {
        console.log(response);
    }
};

module.exports = function (context, packtpubTimer) {
    context.log('Starting...');

    context.log('Loading modules...');
    var Browser = require('zombie');
    context.log('zombie loaded');
    var sendwithus = require('sendwithus');
    context.log('sendwithus loaded');

    var browser = new Browser();
    browser.site = 'https://www.packtpub.com/';
    browser.userAgent = process.env['BROWSER_USER_AGENT'];
    context.log(browser.site);
    browser.visit('packt/offers/free-learning', function() {
        context.log('Page loaded...');
        browser.fill('input[name=email]', process.env['PACKTPUB_USERNAME']);
        browser.fill('input[name=password]', process.env['PACKTPUB_PASSWORD']);
            
        browser.document.forms[0].submit();
        context.log('Logging in...');

        browser.wait().then(function() {
            var claimUrl = browser.query('a[class=twelve-days-claim]').href;

            browser.visit(claimUrl, function() {
                context.log('Claimed book!');
                var book = browser.query('#product-account-list .product-line');
                var cover = browser.query('#product-account-list .product-line .product-thumbnail img.imagecache-thumbview');

                var data = {
                    title: cover.title,
                    image: 'https:' + cover.getAttribute('data-original'),
                    pdf: book.querySelector('.fake-button[format="pdf"]').parentElement.href,
                    epub: book.querySelector('.fake-button[format="epub"]').parentElement.href,
                    date: ('0' + new Date().getDate()).slice(-2) + '-' + ('0' + (new Date().getMonth() + 1)).slice(-2) + '-' + new Date().getFullYear()
                };

                context.log('data', data);

                var mailer = sendwithus(process.env['SENDWITHUS_API_KEY']);

                mailer.send({
                    template: process.env['MAIL_TEMPLATE_PACKTPUB'],
                    recipient: { address: process.env['SENDWITHUS_RECIPIENT'] },
                    template_data: data
                }, function (err, response) {
                    if (err) {
                        context.log(err.statusCode, response);
                    } else {
                        context.log(response);
                    }

                    context.done();
                });
            });    
        })
    });
}