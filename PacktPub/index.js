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