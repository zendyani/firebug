function runTest()
{
    FBTest.sysout("issue2271.START");

    var prefOrigValue = FBTest.getPref("showXMLHttpRequests");
    FBTest.setPref("showXMLHttpRequests", true);

    FBTest.openNewTab(basePath + "console/2271/issue2271.html", function(win)
    {
        FBTest.sysout("issue2271; Test page loaded.");

        FBTest.openFirebug();
        FBTest.enableConsolePanel(function () {
            // Create listener for mutation events.
            var doc = FBTest.getPanelDocument();
            var recognizer = new MutationRecognizer(doc.defaultView, "div",
                {"class": "logRow logRow-errorMessage"});

            // Wait for an error log in the Console panel.
            recognizer.onRecognize(function (element)
            {
                // Verify error log in the console.
                var expectedResult = /\s*document.getElementId is not a function/;
                var errorTitle = element.getElementsByClassName("errorTitle").item(0);
                FBTest.compare(expectedResult, errorTitle.textContent, "There must be an error log");

                FBTest.setPref("showXMLHttpRequests", prefOrigValue);
                FBTest.testDone("issue2271; DONE");
            });

            // Run test implemented on the page.
            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
