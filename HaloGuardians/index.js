module.exports = function (context, haloTimer) {
    context.log('Starting...');

    context.log('Loading modules...');
    var Browser = require('zombie');
    context.log('Modules loaded');
    
    var authUrl = "https://login.live.com/oauth20_authorize.srf?client_id=000000004C0BD2F1&scope=xbox.basic+xbox.offline_access&response_type=code&redirect_uri=https:%2f%2fwww.halowaypoint.com%2fauth%2fcallback&locale=en-us&display=touch&state=https%253a%252f%252fwww.halowaypoint.com%252fen-us%252fgames%252fhalo-5-guardians%252fxbox-one%252frequisitions%252funopened-packs";

    var browser = new Browser();
    browser.userAgent = process.env['BROWSER_USER_AGENT'];
    browser.visit(authUrl, function() {
        context.log('Page loaded...');
        context.log('Filling in email...');
        browser
            .fill("input[type=email]", process.env['MS_ACCOUNT'])
            .pressButton('Next', function() {
                context.log('Filling in password...');
                browser
                    .fill("input[type=password]", process.env['MS_ACCOUNT_PASSWORD'])
                    .pressButton("Sign in", function() {
                        var index = browser.url.indexOf('requisitions');
                        if (index != -1) {
                            context.log('Claimed daily requisition pack!');
                        } else {
                            context.log("unable_to_authentication_with_xbox_live");
                        }
                        context.done();
                    });
            });
    });
}
