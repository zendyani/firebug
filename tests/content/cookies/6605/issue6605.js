function runTest()
{
    FBTest.sysout("issue6605.START");

    FBTest.openNewTab(basePath + "cookies/6605/issue6605.php", function(win)
    {
        FBTest.openFirebug();

        FBTestFireCookie.enableCookiePanel(function(win)
        {
            var panelNode = FBTest.selectPanel("cookies").panelNode;
            var cookieName = "TestCookie6605";
            var cookie = FBTestFireCookie.getCookieByName(panelNode, cookieName);

            var value = cookie.row.getElementsByClassName("cookieValueCol")[0];
            FBTest.compare(" ", value.textContent, "Value must be a space character");

            var rawValue = FBTestFireCookie.expandCookie(panelNode, cookieName, "RawValue");
            FBTest.compare("+", rawValue.textContent, "Raw value must be a plus character");

            FBTestFireCookie.editCookie(cookie, function(dialog) {
                var URLEncodeCheckbox = dialog.document.getElementById("fbURLEncodeValue");
                FBTest.ok(URLEncodeCheckbox && !URLEncodeCheckbox.checked,
                    "'URL encode value' checkbox must not be hecked");

                dialog.EditCookie.onOK();

                var cookie = FBTestFireCookie.getCookieByName(panelNode, cookieName);

                var value = cookie.row.getElementsByClassName("cookieValueCol")[0];
                FBTest.compare(" ", value.textContent, "Value must still be a space character");

                FBTest.testDone("issue6605.DONE");
            });
        });
    });
}
