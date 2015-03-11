var page = require('webpage').create(),
    system = require('system'),
    fs = require('fs'),
    address, output, size;

log = function (message) {
    fs.write("log", message + '\n', "w");
}
log(system.args)
if (system.args.length < 3 || system.args.length > 5) {
    log('Usage: rasterize.js URL filename [paperwidth*paperheight|paperformat] [zoom]');
    log('  paper (pdf output) examples: "5in*7.5in", "10cm*20cm", "A4", "Letter"');
    log('  image (png/jpg output) examples: "1920px" entire page, window width 1920px');
    log('                                   "800px*600px" window, clipped to 800x600');
    phantom.exit(1);
} else {
    address = system.args[1];
    output = system.args[2];
    page.viewportSize = { width: 600, height: 600 };
    if (system.args.length > 3 && system.args[2].substr(-4) === ".pdf") {
        size = system.args[3].split('*');
        page.paperSize = size.length === 2 ? { width: size[0], height: size[1], margin: '0px' }
                                           : { format: system.args[3], orientation: 'portrait', margin: '1cm' };
    } else if (system.args.length > 3 && system.args[3].substr(-2) === "px") {
        size = system.args[3].split('*');
        if (size.length === 2) {
            pageWidth = parseInt(size[0], 10);
            pageHeight = parseInt(size[1], 10);
            page.viewportSize = { width: pageWidth, height: pageHeight };
            page.clipRect = { top: 0, left: 0, width: pageWidth, height: pageHeight };
        } else {
            log("size:", system.args[3]);
            pageWidth = parseInt(system.args[3], 10);
            pageHeight = parseInt(pageWidth * 3/4, 10); // it's as good an assumption as any
            log("pageHeight:",pageHeight);
            page.viewportSize = { width: pageWidth, height: pageHeight };
        }
    }
    if (system.args.length > 4) {
        page.zoomFactor = system.args[4];
    }

    var renderAndExit = function(){
        log('rendering!');
        page.render(output, {format: 'jpg', quality: '95'});
        if (fs.exists(output)) log("written image to disk!");
        phantom.exit();
    }

    page.open(address, function (status) {
        if (status !== 'success') {
            log('Unable to load the address!');
            phantom.exit();
        } else {
            if(window.document.readyState == "complete"){
                if (address.indexOf("http://mvp.gimmie.io/messages/") != -1 ){
                    //gimmie's page, clip to fit the message!
                    var clipRect = page.evaluate(function () {
                      var c = null;
                      message_element = document.querySelector("body#message_snapshot div")
                      if (message_element != null) {
                        c = message_element.getBoundingClientRect();
                      }
                      return c;
                    });

                    if (clipRect!=null) {
                        page.clipRect = {
                            top:    clipRect.top,
                            left:   clipRect.left,
                            width:  clipRect.width,
                            height: clipRect.height
                        };
                    } else {
                        log('Unable to take message snapshot!');
                        phantom.exit();
                    }
                }

                renderAndExit();
            } else {
                window.addEventListener ?
                window.addEventListener("load", renderAndExit, false) :
                window.attachEvent && window.attachEvent("onload", renderAndExit);
            }
        }
    });
}
