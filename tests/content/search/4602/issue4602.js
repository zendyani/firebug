function runTest()
{
    FBTest.sysout("issue4602.START");

    FBTest.openNewTab(basePath + "search/4602/issue4602.html", function(win)
    {
        FBTest.openFirebug();
        var panel = FBTest.selectPanel("stylesheet");
        if (FBTest.ok(FBTest.selectPanelLocationByName(panel, "issue4602.html"),
            "CSS Location Menu should contain an entry for 'issue4602.html'"))
        {
            var doc = panel.panelNode.ownerDocument;

            // Set focus to Firebug, otherwise the selection and the shortcut will be sent to the browser document
            doc.documentElement.focus();

            var range = doc.createRange();
            var startNode = doc.getElementsByClassName("cssPropName").item(0);
            range.setStart(startNode, 0);
            var endNode = doc.getElementsByClassName("cssPropValue").item(0);
            range.setEnd(endNode, 1);
            doc.getSelection().addRange(range);

            FBTest.sendShortcut("F", {accelKey: true});

            // Since FF 22.0a2 inIDOMUtils has a function colorNameToRGB()
            var colorValue = (FBTest.compareFirefoxVersion("22.0a2") >= 0) ?
                "#0000FF" : "blue";

            FBTest.compare("color: " + colorValue, FBTest.getSearchFieldText(),
                "The value inside the search field much match the selection.");
        }

        FBTest.testDone("issue4602.DONE");
    });
}
