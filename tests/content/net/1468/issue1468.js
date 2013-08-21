window.FBTestTimeout = 15000;

function runTest()
{
    FBTest.sysout("issue1468.START");
    FBTest.openNewTab(basePath + "net/1468/issue1468.html", function(win)
    {
        FBTest.enableNetPanel(function(win)
        {
            var filePath = FBTest.getLocalURLBase();
            var doc = win.document;

            // Create temporary file.
            var file = createFile("issue1468.txt");

            // Get file input and set the value.
            var userFile = doc.getElementById("userFile");
            userFile.value = file.path;

            var tabbrowser = FBTest.getBrowser();
            var browser = tabbrowser.getBrowserForTab(tabbrowser.selectedTab);
            browser.addEventListener("load", function()
            {
                // Remove the file
                var removed = true;
                try
                {
                    file.remove(true);
                }
                catch (err)
                {
                    removed = false;
                    FBTest.sysout("issue1468.Failed to remove a file EXCEPTION", err);
                }

                FBTest.ok(removed, "Posted file must *not* be locked.");
                FBTest.testDone("issue1468.DONE");
            }, true);

            // Submit the form.
            var userSubmit = doc.getElementById("userSubmit");
            FBTest.click(userSubmit);
        });
    });
}

function createFile(name)
{
    var dirService = Cc["@mozilla.org/file/directory_service;1"]
        .getService(Ci.nsIProperties);

    // Get unique file within user profile directory.
    var file = dirService.get("TmpD", Ci.nsIFile);
    file.append(name);
    file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);

    // Initialize output stream.
    var outputStream = Cc["@mozilla.org/network/file-output-stream;1"]
        .createInstance(Ci.nsIFileOutputStream);

    // Create some content.
    var text = "Test file for upload (issue1468).";
    outputStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
    outputStream.write(text, text.length);
    outputStream.close();

    FBTest.sysout("issue1468.createFile: " + file.path);

    return file;
}
