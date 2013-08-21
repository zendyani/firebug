var Fx13 = FBTest.compareFirefoxVersion("13.0a1") >= 0;

/**
 * Test for DOM session and local storage.
 *
 * Related issues:
 * Issue 3611: localStorage and sessionStorage not shown in DOM panel
 */
function runTest()
{
    FBTest.sysout("storage.START");
    FBTest.openNewTab(basePath + "dom/storage/storage.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var tasks = new FBTest.TaskList();
            tasks.push(testEmptySessionStorage, win);
            tasks.push(FBTest.executeCommandAndVerify, "sessionStorage",
                new RegExp("\\s*" + FW.FBL.$STRP("firebug.storage.totalItems", [0]) + "\\s*"),
                "a", "objectLink-Storage");

            tasks.push(testEmptyLocalStorage, win);
            tasks.push(FBTest.executeCommandAndVerify, "localStorage",
                new RegExp("\\s*" + FW.FBL.$STRP("firebug.storage.totalItems", [0]) + "\\s*"),
                "a", "objectLink-Storage");

            var expected = Fx13 ?
                "\\s*name=\\\"item1\\\",\\s*issue=\\\"value1\\\"\\s*" :
                "\\s*issue=\\\"value1\\\",\\s*name=\\\"item1\\\"\\s*";

            tasks.push(testSessionStorageData, win);
            tasks.push(FBTest.executeCommandAndVerify, "sessionStorage",
                new RegExp("\\s*" + FW.FBL.$STRP("firebug.storage.totalItems", [2]) + expected),
                "a", "objectLink-Storage");

            var expected = Fx13 ?
                "\\s*item6=\\\"6\\\", item7=\\\"7\\\", item0=\\\"0\\\", item8=\\\"8\\\", item1=\\\"1\\\", item2=\\\"2\\\", item3=\\\"3\\\", item9=\\\"9\\\", item4=\\\"4\\\", item5=\\\"5\\\"" :
                "\\s*item6=\\\"6\\\", item3=\\\"3\\\", item8=\\\"8\\\", item0=\\\"0\\\", item5=\\\"5\\\", item2=\\\"2\\\", item7=\\\"7\\\", item4=\\\"4\\\", item9=\\\"9\\\", item1=\\\"1\\\"";

            tasks.push(testLocalStorageData, win);
            tasks.push(FBTest.executeCommandAndVerify, "localStorage",
                new RegExp("\\s*" + FW.FBL.$STRP("firebug.storage.totalItems", [10]) + expected),
                    "a", "objectLink-Storage");

            tasks.run(function()
            {
                FBTest.testDone("storage.DONE");
            });
        });
    });
}

function testEmptySessionStorage(callback, win)
{
    FBTest.waitForDOMProperty("sessionStorage", function(row)
    {
        FBTest.compare(new RegExp("\\s*" + FW.FBL.$STRP("firebug.storage.totalItems", [0]) + "\\s*"),
            row.textContent, "The session storage must be empty now");
        callback();
    });

    // Clear storage and refresh panel content.
    FBTest.click(win.document.getElementById("clearStorage"));
    var panel = FBTest.selectPanel("dom");
    panel.rebuild(true);
}

function testEmptyLocalStorage(callback, win)
{
    FBTest.waitForDOMProperty("localStorage", function(row)
    {
        FBTest.compare(new RegExp("\\s*" + FW.FBL.$STRP("firebug.storage.totalItems", [0]) + "\\s*"),
            row.textContent, "The local storage must be empty now");
        callback();
    });

    // Clear storage and refresh panel content.
    FBTest.click(win.document.getElementById("clearStorage"));
    var panel = FBTest.selectPanel("dom");
    panel.rebuild(true);
}

function testSessionStorageData(callback, win)
{
    FBTest.waitForDOMProperty("sessionStorage", function(row)
    {
        var expected = Fx13 ?
            "\\s*name=\\\"item1\\\",\\s*issue=\\\"value1\\\"\\s*" :
            "\\s*issue=\\\"value1\\\",\\s*name=\\\"item1\\\"\\s*";

        FBTest.compare(
            new RegExp("\\s*" + FW.FBL.$STRP("firebug.storage.totalItems", [2]) + expected),
            row.textContent, "The session storage must have proper data");
        callback();
    });

    // Init storage and refresh panel content.
    FBTest.click(win.document.getElementById("initStorage"));
    var panel = FBTest.selectPanel("dom");
    panel.rebuild(true);
}

function testLocalStorageData(callback, win)
{
    FBTest.waitForDOMProperty("localStorage", function(row)
    {
        var expected = Fx13 ?
            "\\s*item6=\\\"6\\\",\\s*item7=\\\"7\\\",\\s*item0=\\\"0\\\",\\s*" + FW.FBL.$STR("firebug.reps.more") + "...\\s*" :
            "\\s*item6=\\\"6\\\",\\s*item3=\\\"3\\\",\\s*" + FW.FBL.$STR("firebug.reps.more") + "...\\s*";

        FBTest.compare(
            new RegExp("\\s*" + FW.FBL.$STRP("firebug.storage.totalItems", [10]) + expected),
            row.textContent, "The local storage must have proper data");
        callback();
    });

    // Clear storage and refresh panel content.
    FBTest.click(win.document.getElementById("initStorage"));
    var panel = FBTest.selectPanel("dom");
    panel.rebuild(true);
}

