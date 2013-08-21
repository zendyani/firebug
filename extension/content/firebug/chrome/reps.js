/* See license.txt for terms of usage */

define([
    "firebug/lib/object",
    "firebug/lib/array",
    "firebug/firebug",
    "firebug/lib/domplate",
    "firebug/chrome/firefox",
    "firebug/lib/xpcom",
    "firebug/lib/locale",
    "firebug/html/htmlLib",
    "firebug/lib/events",
    "firebug/lib/wrapper",
    "firebug/lib/options",
    "firebug/lib/url",
    "firebug/js/sourceLink",
    "firebug/js/stackFrame",
    "firebug/lib/css",
    "firebug/lib/dom",
    "firebug/chrome/window",
    "firebug/lib/system",
    "firebug/lib/xpath",
    "firebug/lib/string",
    "firebug/lib/xml",
    "firebug/dom/toggleBranch",
    "firebug/console/closureInspector",
    "firebug/chrome/menu",
    "arch/compilationunit",
    "firebug/net/netUtils",
    "firebug/chrome/panelActivation",
],
function(Obj, Arr, Firebug, Domplate, Firefox, Xpcom, Locale, HTMLLib, Events, Wrapper, Options,
    Url, SourceLink, StackFrame, Css, Dom, Win, System, Xpath, Str, Xml, ToggleBranch,
    ClosureInspector, Menu, CompilationUnit, NetUtils, PanelActivation) {

with (Domplate) {

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

// xxxHonza: the only global should be Firebug object.
var FirebugReps = window.FirebugReps = {};

try
{
    // xxxHonza: RJS
    var FBS = {};
    Components.utils["import"]("resource://firebug/firebug-service.js", FBS);
    var jsd = Cc["@mozilla.org/js/jsd/debugger-service;1"].getService(Ci.jsdIDebuggerService);
}
catch (err)
{
}

// ********************************************************************************************* //
// Common Tags

var OBJECTBOX = FirebugReps.OBJECTBOX =
    SPAN({"class": "objectBox objectBox-$className", role: "presentation"});

var PREOBJECTBOX =
    PRE({"class": "objectBox inline objectBox-$className", role: "presentation"});

var OBJECTBLOCK = FirebugReps.OBJECTBLOCK =
    DIV({"class": "objectBox objectBox-$className focusRow subLogRow", role: "listitem"});

var OBJECTLINK = FirebugReps.OBJECTLINK =
    A({
        "class": "objectLink objectLink-$className a11yFocus",
        _repObject: "$object"
    });

// ********************************************************************************************* //

FirebugReps.Undefined = domplate(Firebug.Rep,
{
    tag: OBJECTBOX("undefined"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "undefined",

    supportsObject: function(object, type)
    {
        return type == "undefined";
    }
});

// ********************************************************************************************* //

FirebugReps.Null = domplate(Firebug.Rep,
{
    tag: OBJECTBOX("null"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "null",

    supportsObject: function(object, type)
    {
        return object == null;
    }
});

// ********************************************************************************************* //

FirebugReps.Hint = domplate(Firebug.Rep,
{
    tag: OBJECTBOX("$object"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "hint",
});

// ********************************************************************************************* //

FirebugReps.Nada = domplate(Firebug.Rep,
{
    tag: SPAN(""),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "nada"
});

// ********************************************************************************************* //

FirebugReps.Number = domplate(Firebug.Rep,
{
    tag: OBJECTBOX({"_repObject": "$object"}, "$object"),
    tinyTag: OBJECTBOX("$object"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "number",

    supportsObject: function(object, type)
    {
        return type == "boolean" || type == "number";
    }
});

// ********************************************************************************************* //

// To support copying strings with multiple spaces, tabs, newlines etc. correctly
// we are unfortunately required by Firefox to use a <pre> tag (bug 116083).
// Don't do that with all OBJECTBOX's though - it inserts newlines *everywhere*.
// (See issues 3816, 6130.)
// XXX: This would look much nicer with support for IF in domplate.
var reSpecialWhitespace = /  |[\t\n]/;
FirebugReps.SpecialWhitespaceString = domplate(Firebug.Rep,
{
    tag: PREOBJECTBOX({"_repObject": "$object"}, "&quot;$object&quot;"),

    shortTag: OBJECTBOX({"_repObject": "$object"}, "&quot;$object|cropMultipleLines&quot;"),
    tinyTag: OBJECTBOX("&quot;$object|cropMultipleLines&quot;"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "string",

    supportsObject: function(object, type)
    {
        return (type == "string" && reSpecialWhitespace.test(object));
    }
});

FirebugReps.String = domplate(Firebug.Rep,
{
    tag: OBJECTBOX({"_repObject": "$object"}, "&quot;$object&quot;"),

    shortTag: OBJECTBOX({"_repObject": "$object"}, "&quot;$object|cropMultipleLines&quot;"),
    tinyTag: OBJECTBOX("&quot;$object|cropMultipleLines&quot;"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "string",

    supportsObject: function(object, type)
    {
        return type == "string";
    }
});

// ********************************************************************************************* //

FirebugReps.XML = domplate(Firebug.Rep,
{
    tag: OBJECTBOX("$object|asString"),

    shortTag: OBJECTBOX("$object|asShortString"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "xml",

    supportsObject: function(object, type)
    {
        return type == "xml";
    },

    asString: function(object)
    {
        return object.toXMLString();
    },

    asShortString: function(object)
    {
        return cropMultipleLines(this.asString(object));
    },
});

// ********************************************************************************************* //

FirebugReps.Text = domplate(Firebug.Rep,
{
    tag: OBJECTBOX("$object"),

    // Refer to SpecialWhitespaceString above.
    specialWhitespaceTag: PREOBJECTBOX("$object"),

    shortTag: OBJECTBOX("$object|cropMultipleLines"),

    getWhitespaceCorrectedTag: function(str)
    {
        return reSpecialWhitespace.test(str) ? this.specialWhitespaceTag : this.tag;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "text"
});

// ********************************************************************************************* //

FirebugReps.Caption = domplate(Firebug.Rep,
{
    tag: SPAN({"class": "caption"}, "$object")
});

// ********************************************************************************************* //

FirebugReps.Warning = domplate(Firebug.Rep,
{
    tag: DIV({"class": "warning focusRow", role: "listitem"}, "$object|STR")
});

// ********************************************************************************************* //

FirebugReps.Func = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK("$object|summarizeFunction"),

    summarizeFunction: function(fn)
    {
        var fnText = Str.safeToString(fn);
        var namedFn = /^function ([^(]+\([^)]*\))/.exec(fnText);
        var anonFn = /^function \(/.test(fnText);
        var displayName = fn.displayName;

        return namedFn ? namedFn[1] : (displayName ? displayName + "()" :
            (anonFn ? "function()" : fnText));
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    copySource: function(fn)
    {
        if (fn && typeof (fn['toSource']) == 'function')
            System.copyToClipboard(fn.toSource());
    },

    monitor: function(fn, monitored)
    {
        if (monitored)
            Firebug.Debugger.unmonitorFunction(fn,  "monitor");
        else
            Firebug.Debugger.monitorFunction(fn, "monitor");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "function",

    supportsObject: function(object, type)
    {
        return type == "function";
    },

    inspectObject: function(fn, context)
    {
        var sourceLink = Firebug.SourceFile.findSourceForFunction(fn, context);
        if (sourceLink)
            Firebug.chrome.select(sourceLink);

        if (FBTrace.DBG_FUNCTION_NAMES)
            FBTrace.sysout("reps.function.inspectObject selected sourceLink is ", sourceLink);
    },

    getTooltip: function(fn, context)
    {
        var script = Firebug.SourceFile.findScriptForFunctionInContext(context, fn);
        if (script)
        {
            return Locale.$STRF("Line", [Url.normalizeURL(script.fileName),
                script.baseLineNumber]);
        }
        else
        {
            if (fn.toString)
                return fn.toString();
        }
    },

    getTitle: function(fn, context)
    {
        var name = fn.name ? fn.name : "function";
        return name + "()";
    },

    getContextMenuItems: function(fn, target, context, script)
    {
        if (!script)
            script = Firebug.SourceFile.findScriptForFunctionInContext(context, fn);
        if (!script)
            return;

        var scriptInfo = Firebug.SourceFile.getSourceFileAndLineByScript(context, script);
        var monitored = scriptInfo ? FBS.fbs.isMonitored(scriptInfo.sourceFile.href,
            scriptInfo.lineNo) : false;

        var self = this;
        var name = script ? StackFrame.getFunctionName(script, context) : fn.name;
        return [
            {
                label: Locale.$STRF("ShowCallsInConsole", [name]),
                tooltiptext: Locale.$STRF("dom.tip.Log_Calls_To_Function", [name]),
                nol10n: true,
                type: "checkbox",
                checked: monitored,
                command: function()
                {
                    var checked = this.hasAttribute("checked");
                    self.monitor(fn, !checked);
                }
            },
            "-",
            {
                label: "CopySource",
                tooltiptext: "dom.tip.Copy_Source",
                command: Obj.bindFixed(this.copySource, this, fn)
            }
        ];
    }
});

// ********************************************************************************************* //

FirebugReps.Obj = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK(
            SPAN({"class": "objectTitle"}, "$object|getTitle "),
            SPAN({"class": "objectLeftBrace", role: "presentation"}, "{"),
            FOR("prop", "$object|shortPropIterator",
                " $prop.name",
                SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
                TAG("$prop.tag", {object: "$prop.object"}),
                SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
            ),
            SPAN({"class": "objectRightBrace"}, "}")
        ),

    shortTag:
        OBJECTLINK(
            SPAN({"class": "objectTitle"}, "$object|getTitle "),
            SPAN({"class": "objectLeftBrace", role: "presentation"}, "{"),
            FOR("prop", "$object|shortPropIterator",
                " $prop.name",
                SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
                TAG("$prop.tag", {object: "$prop.object"}),
                SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
            ),
            SPAN({"class": "objectRightBrace"}, "}")
        ),

    titleTag:
        SPAN({"class": "objectTitle"}, "$object|getTitleTag"),

    getTitleTag: function(object)
    {
        var title;
        if (typeof(object) == "string")
            title = object;
        else
            title = this.getTitle(object);

        if (title == "Object")
            title = "{...}";

        return title;
    },

    longPropIterator: function (object)
    {
        return this.propIterator(object, 100);
    },

    shortPropIterator: function (object)
    {
        return this.propIterator(object, Options.get("ObjectShortIteratorMax"));
    },

    propIterator: function (object, max)
    {
        function isInterestingProp(t, value)
        {
            return (t == "boolean" || t == "number" || (t == "string" && value) ||
                (t == "object" && value && value.toString));
        };

        // Object members with non-empty values are preferred since it gives the
        // user a better overview of the object.
        var props = [];
        this.getProps(props, object, max, isInterestingProp);

        if (props.length <= max)
        {
            // There is not enough props yet (or at least, not enough props to
            // be able to know whether we should print "more..." or not).
            // Let's display also empty members and functions.
            this.getProps(props, object, max, function(t, value)
            {
                return !isInterestingProp(t, value);
            });
        }

        if (props.length > max)
        {
            props[props.length-1] = {
                object: Locale.$STR("firebug.reps.more") + "...",
                tag: FirebugReps.Caption.tag,
                name: "",
                equal: "",
                delim: ""
            };
        }
        else if (props.length > 0)
        {
            props[props.length-1].delim = '';
        }

        return props;
    },

    getProps: function (props, object, max, filter)
    {
        max = max || 3;
        if (!object)
            return [];

        var len = 0;

        try
        {
            for (var name in object)
            {
                var value;
                try
                {
                    value = object[name];
                }
                catch (exc)
                {
                    continue;
                }

                var t = typeof(value);
                if (filter(t, value))
                {
                    var rep = Firebug.getRep(value);
                    var tag = rep.tinyTag || rep.shortTag || rep.tag;
                    if ((t == "object" || t == "function") && value)
                    {
                        value = rep.getTitle(value);
                        if (rep.titleTag)
                            tag = rep.titleTag;
                        else
                            tag = FirebugReps.Obj.titleTag;
                    }

                    if (props.length <= max)
                        props.push({tag: tag, name: name, object: value, equal: "=", delim: ", "});
                    else
                        break;
                }
            }
        }
        catch (exc)
        {
            // Sometimes we get exceptions when trying to read from certain objects, like
            // StorageList, but don't let that gum up the works
            // XXXjjb also History.previous fails because object is a web-page object
            // which does not have permission to read the history
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "object",

    supportsObject: function(object, type)
    {
        return true;
    }
});

// ********************************************************************************************* //
// Reference

/**
 * A placeholder used instead of cycle reference within arrays.
 * @param {Object} target The original referenced object
 */
FirebugReps.ReferenceObj = function(target)
{
    this.target = target;
};

/**
 * Rep for cycle reference in an array.
 */
FirebugReps.Reference = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK({_repObject: "$object"},
            SPAN({title: "$object|getTooltip"},
                "[...]")
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "Reference",

    supportsObject: function(object, type)
    {
        return (object instanceof FirebugReps.ReferenceObj);
    },

    getTooltip: function(object)
    {
        return Locale.$STR("firebug.reps.reference");
    },

    getRealObject: function(object)
    {
        return object.target;
    },
});

// ********************************************************************************************* //

FirebugReps.ArrBase = domplate(FirebugReps.Obj,
{
    className: "array",
    toggles: new ToggleBranch.ToggleBranch(),

    titleTag:
        SPAN({"class": "objectTitle"}, "$object|getTitleTag"),

    getTitle: function(object, context)
    {
        return "[" + object.length + "]";
    },

    supportsObject: function(object, type)
    {
        return this.isArray(object);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    longArrayIterator: function(array)
    {
        return this.arrayIterator(array, 300);
    },

    shortArrayIterator: function(array)
    {
        return this.arrayIterator(array, Options.get("ObjectShortIteratorMax"));
    },

    arrayIterator: function(array, max)
    {
        var items = [];
        for (var i = 0; i < array.length && i <= max; ++i)
        {
            try
            {
                var delim = (i == array.length-1 ? "" : ", ");
                var value = array[i];

                // Cycle detected
                if (value === array)
                    value = new FirebugReps.ReferenceObj(value);

                var rep = Firebug.getRep(value);
                var tag = rep.shortTag || rep.tag;
                items.push({object: value, tag: tag, delim: delim});
            }
            catch (exc)
            {
                var rep = Firebug.getRep(exc);
                var tag = rep.shortTag || rep.tag;

                items.push({object: exc, tag: tag, delim: delim});
            }
        }

        if (array.length > max + 1)
        {
            items[max] = {
                object: (array.length-max) + " " + Locale.$STR("firebug.reps.more") + "...",
                tag: FirebugReps.Caption.tag,
                delim: ""
            };
        }

        return items;
    },

    getItemIndex: function(child)
    {
        var arrayIndex = 0;
        for (child = child.previousSibling; child; child = child.previousSibling)
        {
            if (child.repObject)
                ++arrayIndex;
        }
        return arrayIndex;
    },

    /**
     * Returns true if the passed object is an array with additional (custom) properties,
     * otherwise returns false. Custom properties should be displayed in extra expandable
     * section.
     *
     * Example array with a custom property.
     * var arr = [0, 1];
     * arr.myProp = "Hello";
     *
     * @param {Array} array The array object.
     */
    hasSpecialProperties: function(array)
    {
        function isInteger(x)
        {
            var y = parseInt(x, 10);
            if (isNaN(y))
                return false;
           return x === y.toString();
        }

        var n = 0;
        var props = Object.getOwnPropertyNames(array);
        for (var i=0; i<props.length; i++)
        {
            var p = props[i];

            // Valid indexes are skipped
            if (isInteger(p))
                continue;

            // Ignore standard 'length' property, anything else is custom.
            if (p != "length")
                return true;
        }

        return false;
    },

    onToggleProperties: function(event)
    {
        var target = event.originalTarget;
        if (Css.hasClass(target, "objectBox-array"))
        {
            Events.cancelEvent(event);

            Css.toggleClass(target, "opened");

            var propBox = target.getElementsByClassName("arrayProperties").item(0);
            if (Css.hasClass(target, "opened"))
            {
                Firebug.DOMPanel.DirTable.tag.replace(
                    {object: target.repObject, toggles: this.toggles}, propBox);
            }
            else
            {
                Dom.clearNode(propBox);
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    highlightObject: function(object, context, target)
    {
        // Highlighting huge amount of elements on the page can cause serious performance
        // problems (see issue 4736). So, avoid highlighting if the number of elements in
        // the array exceeds specified limit.
        var arr = this.getRealObject(object, context);
        var limit = Options.get("multiHighlightLimit");
        if (!arr || (limit > 0 && arr.length > limit))
        {
            if (Css.hasClass(target, "arrayLeftBracket") ||
                Css.hasClass(target, "arrayRightBracket"))
            {
                var tooltip = Locale.$STRF("console.multiHighlightLimitExceeded", [limit]);
                target.setAttribute("title", tooltip);
            }

            // Do not highlight, a tooltip will be displayed instead.
            return;
        }

        target.removeAttribute("title");

        // Highlight multiple elements on the page.
        Firebug.Inspector.highlightObject(arr, context);
    },

    isArray: function(obj)
    {
        return false;
    }
});

// ********************************************************************************************* //

FirebugReps.Arr = domplate(FirebugReps.ArrBase,
{
    tag:
        OBJECTBOX({_repObject: "$object",
            $hasTwisty: "$object|hasSpecialProperties",
            onclick: "$onToggleProperties"},
            SPAN({"class": "arrayLeftBracket", role: "presentation"}, "["),
            FOR("item", "$object|longArrayIterator",
                TAG("$item.tag", {object: "$item.object"}),
                SPAN({"class": "arrayComma", role: "presentation"}, "$item.delim")
            ),
            SPAN({"class": "arrayRightBracket", role: "presentation"}, "]"),
            SPAN({"class": "arrayProperties", role: "group"})
        ),

    shortTag:
        OBJECTBOX({_repObject: "$object",
            $hasTwisty: "$object|hasSpecialProperties",
            onclick: "$onToggleProperties"},
            SPAN({"class": "arrayLeftBracket", role: "presentation"}, "["),
            FOR("item", "$object|shortArrayIterator",
                TAG("$item.tag", {object: "$item.object"}),
                SPAN({"class": "arrayComma", role: "presentation"}, "$item.delim")
            ),
            SPAN({"class": "arrayRightBracket"}, "]"),
            SPAN({"class": "arrayProperties", role: "group"})
        ),

    // http://code.google.com/p/fbug/issues/detail?id=874
    isArray: function(obj)
    {
        try
        {
            if (Arr.isArray(obj))
                return true;
            else if (isFinite(obj.length) && typeof obj.callee === "function") // arguments
                return true;
        }
        catch (exc) {}
        return false;
    }
});

// ********************************************************************************************* //

/**
 * Any arrayish object that is not directly Array type (e.g. HTMLCollection, NodeList, etc.)
 */
FirebugReps.ArrayLikeObject = domplate(FirebugReps.ArrBase,
{
    tag:
        OBJECTBOX({_repObject: "$object",
            $hasTwisty: "$object|hasSpecialProperties",
            onclick: "$onToggleProperties"},
            A({"class": "objectTitle objectLink", onclick: "$onClickTitle"},
                "$object|getTitle"
            ),
            SPAN({"class": "arrayLeftBracket", role: "presentation"}, "["),
            FOR("item", "$object|longArrayIterator",
                TAG("$item.tag", {object: "$item.object"}),
                SPAN({"class": "arrayComma", role: "presentation"}, "$item.delim")
            ),
            SPAN({"class": "arrayRightBracket", role: "presentation"}, "]"),
            SPAN({"class": "arrayProperties", role: "group"})
        ),

    shortTag:
        OBJECTBOX({_repObject: "$object",
            $hasTwisty: "$object|hasSpecialProperties",
            onclick: "$onToggleProperties"},
            A({"class": "objectTitle objectLink", onclick: "$onClickTitle"},
                "$object|getTitle"
            ),
            SPAN({"class": "arrayLeftBracket", role: "presentation"}, "["),
            FOR("item", "$object|shortArrayIterator",
                TAG("$item.tag", {object: "$item.object"}),
                SPAN({"class": "arrayComma", role: "presentation"}, "$item.delim")
            ),
            SPAN({"class": "arrayRightBracket"}, "]"),
            SPAN({"class": "arrayProperties", role: "group"})
        ),

    onClickTitle: function(event)
    {
        var obj = Firebug.getRepObject(event.target);
        Firebug.chrome.select(obj);
    },

    getTitle: function(obj, context)
    {
        const re = /\[object ([^\]]*)/;
        var label = Object.prototype.toString.call(obj);
        var m = re.exec(label);
        return (m ? m[1] : label);
    },

    isArray: function(obj)
    {
        return Arr.isArrayLike(obj);
    }
});

// ********************************************************************************************* //

FirebugReps.Property = domplate(Firebug.Rep,
{
    supportsObject: function(object, type)
    {
        return object instanceof FirebugReps.PropertyObj;
    },

    getRealObject: function(prop, context)
    {
        return prop.object[prop.name];
    },

    getTitle: function(prop, context)
    {
        return prop.name;
    }
});

// ********************************************************************************************* //

FirebugReps.PropertyObj = function(object, name)
{
    this.object = object;
    this.name = name;

    this.getObject = function()
    {
        return object[name];
    };
};

// ********************************************************************************************* //

FirebugReps.NetFile = domplate(FirebugReps.Obj,
{
    supportsObject: function(object, type)
    {
        if (typeof(Firebug.NetFile) == "undefined")
            return false;

        return object instanceof Firebug.NetFile;
    },

    browseObject: function(file, context)
    {
        Win.openNewTab(file.href);
        return true;
    },

    getRealObject: function(file, context)
    {
        return NetUtils.getRealObject(file, context);
    }
});

// ********************************************************************************************* //

function instanceOf(object, Klass)
{
    while (object != null)
    {
        if (object == Klass.prototype)
           return true;

        if (typeof(object) === "xml")
            return (Klass.prototype === Xml.prototype);

        object = object.__proto__;
    }

    return false;
}

// ********************************************************************************************* //

FirebugReps.Element = domplate(Firebug.Rep,
{
    className: "element",

    tag:
        OBJECTLINK(
            "&lt;",
            SPAN({"class": "nodeTag"}, "$object|getLocalName"),
            FOR("attr", "$object|attrIterator",
                "&nbsp;$attr.localName=&quot;",
                SPAN({"class": "nodeValue"}, "$attr|getAttrValue"),
                "&quot;"
            ),
            "&gt;"
         ),

    shortTag:
        OBJECTLINK(
            SPAN({"class": "$object|getVisible"},
                SPAN({"class": "selectorTag"}, "$object|getSelectorTag"),
                SPAN({"class": "selectorId"}, "$object|getSelectorId"),
                SPAN({"class": "selectorClass"}, "$object|getSelectorClass"),
                TAG("$object|getValueTag", {object: "$object"})
            )
         ),

    // Generic template for various element values
    valueTag:
        SPAN({"class": "selectorValue"}, "$object|getValue"),

    // Template for <input> element with a single value coming from attribute.
    singleInputTag:
        SPAN(
            SPAN("&nbsp;"),
            SPAN({"class": "selectorValue"},
                Locale.$STR("firebug.reps.element.attribute_value") + " = "
            ),
            SPAN({"class": "attributeValue inputValue"},
                TAG(FirebugReps.String.tag, {object: "$object|getValueFromAttribute"})
            )
        ),

    // Template for <input> element with two different values (attribute and property)
    multipleInputTag:
        SPAN(
            SPAN("&nbsp;"),
            SPAN({"class": "selectorValue"},
                Locale.$STR("firebug.reps.element.property_value") + " = "
            ),
            SPAN({"class": "propertyValue inputValue"},
                TAG(FirebugReps.String.tag, {object: "$object|getValueFromProperty"})
            ),
            SPAN("&nbsp;"),
            SPAN({"class": "selectorValue"},
                Locale.$STR("firebug.reps.element.attribute_value") + " = "
            ),
            SPAN({"class": "attributeValue inputValue"},
                TAG(FirebugReps.String.tag, {object: "$object|getValueFromAttribute"})
            )
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    getValueTag: function(elt)
    {
        // Use proprietary template for <input> elements that can have two
        // different values. One coming from attribute 'value' and one coming
        // from property 'value'.
        if (elt instanceof window.HTMLInputElement)
        {
            var attrValue = elt.getAttribute("value");
            var propValue = elt.value;

            if (attrValue != propValue)
                return this.multipleInputTag;
            else
                return this.singleInputTag;
        }

        return this.valueTag;
    },

    getValueFromAttribute: function(elt)
    {
        var limit = Options.get("stringCropLength");
        var value = elt.getAttribute("value");
        return Str.cropString(value, limit);
    },

    getValueFromProperty: function(elt)
    {
        var limit = Options.get("stringCropLength");
        return Str.cropString(elt.value, limit);
    },

    getValue: function(elt)
    {
        var value;

        if (elt instanceof window.HTMLImageElement)
            value = Url.getFileName(elt.getAttribute("src"));
        else if (elt instanceof window.HTMLAnchorElement)
            value = Url.getFileName(elt.getAttribute("href"));
        else if (elt instanceof window.HTMLInputElement)
            value = elt.getAttribute("value");
        else if (elt instanceof window.HTMLFormElement)
            value = Url.getFileName(elt.getAttribute("action"));
        else if (elt instanceof window.HTMLScriptElement)
            value = Url.getFileName(elt.getAttribute("src"));

        return value ? " " + Str.cropMultipleLines(value, 20) : "";
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    getLocalName: function(object)
    {
        try
        {
            return Xml.getLocalName(object);
        }
        catch (err)
        {
            return "";
        }
    },

    getNodeName: function(object)
    {
        try
        {
            return Xml.getNodeName(object);
        }
        catch (err)
        {
            return "";
        }
    },

    getAttrValue: function(attr)
    {
        var limit = Firebug.displayedAttributeValueLimit;
        return (limit > 0) ? Str.cropString(attr.value, limit) : attr.value;
    },

    getVisible: function(elt)
    {
        return Xml.isVisible(elt) ? "" : "selectorHidden";
    },

    getSelectorTag: function(elt)
    {
        return this.getLocalName(elt);
    },

    getSelectorId: function(elt)
    {
        try
        {
            return elt.id ? ("#" + elt.id) : "";
        }
        catch (e)
        {
            return "";
        }
    },

    getSelectorClass: function(elt)
    {
        try
        {
            return elt.classList.length > 0 ? ("." + elt.classList[0]) : "";
        }
        catch (err)
        {
            return "";
        }
    },

    attrIterator: function(elt)
    {
        var attrs = [];
        var idAttr, classAttr;
        if (elt.attributes)
        {
            for (var i = 0; i < elt.attributes.length; ++i)
            {
                var attr = elt.attributes[i];
                if (attr.localName.indexOf("-moz-math") != -1)
                    continue;
                if (attr.localName.indexOf("firebug-") != -1)
                    continue;
                else if (attr.localName == "id")
                    idAttr = attr;
                else if (attr.localName == "class")
                    classAttr = attr;
                else
                    attrs.push(attr);
            }
        }

        // Make sure 'id' and 'class' attributes are displayed first.
        if (classAttr)
            attrs.splice(0, 0, classAttr);
        if (idAttr)
            attrs.splice(0, 0, idAttr);

        return attrs;
    },

    shortAttrIterator: function(elt)
    {
        // Short version returns only 'id' and 'class' attributes.
        var attrs = [];
        if (elt.attributes)
        {
            for (var i = 0; i < elt.attributes.length; ++i)
            {
                var attr = elt.attributes[i];
                if (attr.localName == "id" || attr.localName == "class")
                    attrs.push(attr);
            }
        }
        return attrs;
    },

    getHidden: function(elt)
    {
        return Xml.isVisible(elt) ? "" : "nodeHidden";
    },

    getXPath: function(elt)
    {
        return Xpath.getElementTreeXPath(elt);
    },

    getNodeTextGroups: function(element)
    {
        var text =  element.textContent;
        if (!Firebug.showFullTextNodes)
        {
            text = Str.cropString(text,50);
        }

        var escapeGroups=[];

        if (Firebug.showTextNodesWithWhitespace)
            escapeGroups.push({
                "group": "whitespace",
                "class": "nodeWhiteSpace",
                "extra": {
                    "\t": "_Tab",
                    "\n": "_Para",
                    " " : "_Space"
                }
            });

        if (Firebug.entityDisplay != "symbols")
            escapeGroups.push({
                "group": "text",
                "class": "nodeTextEntity",
                "extra": {}
            });

        if (escapeGroups.length)
            return Str.escapeGroupsForEntities(text, escapeGroups, Options.get("entityDisplay"));
        else
            return [{str:text, "class": "", extra: ""}];
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    copyHTML: function(elt)
    {
        var html = Xml.getElementHTML(elt);
        System.copyToClipboard(html);
    },

    copyInnerHTML: function(elt)
    {
        System.copyToClipboard(elt.innerHTML);
    },

    copyXPath: function(elt)
    {
        var xpath = Xpath.getElementXPath(elt);
        System.copyToClipboard(xpath);
    },

    copyCSSPath: function(elt)
    {
        var csspath = Css.getElementCSSPath(elt);
        System.copyToClipboard(csspath);
    },

    paste: function(elt, clipboardContent, mode)
    {
        if (elt instanceof window.HTMLElement)
            return this.pasteHTML.apply(this, arguments);
        else
            return this.pasteXML.apply(this, arguments);
    },

    pasteHTML: function(elt, clipboardContent, mode)
    {
        if (mode === "replaceInner")
            elt.innerHTML = clipboardContent;
        else if (mode === "replaceOuter")
            elt.outerHTML = clipboardContent;
        else
            elt.insertAdjacentHTML(mode, clipboardContent);
    },

    pasteXML: function(elt, clipboardContent, mode)
    {
        var contextNode, parentNode = elt.parentNode;
        if (["beforeBegin", "afterEnd", "replaceOuter"].indexOf(mode) >= 0)
            contextNode = parentNode;
        else
            contextNode = elt;

        var pastedElements = Dom.markupToDocFragment(clipboardContent, contextNode);
        switch (mode)
        {
            case "beforeBegin":
                parentNode.insertBefore(pastedElements, elt);
                break;
            case "afterBegin":
                elt.insertBefore(pastedElements, elt.firstChild);
                break;
            case "beforeEnd":
                elt.appendChild(pastedElements);
                break;
            case "afterEnd":
                Dom.insertAfter(pastedElements, elt);
                break;
            case "replaceInner":
                Dom.eraseNode(elt);
                elt.appendChild(pastedElements);
                break;
            case "replaceOuter":
                parentNode.replaceChild(pastedElements, elt);
                break;
        }
    },

    persistor: function(context, xpath)
    {
        var elts = xpath
            ? Xpath.getElementsByXPath(context.window.document, xpath)
            : null;

        return elts && elts.length ? elts[0] : null;
    },

    reloadFrame: function(frame)
    {
        frame.contentDocument.location.reload();
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    supportsObject: function(object, type)
    {
        return object instanceof window.Element;
    },

    browseObject: function(elt, context)
    {
        var tag = elt.localName.toLowerCase();
        if (tag == "script" || tag == "img" || tag == "iframe" || tag == "frame")
            Win.openNewTab(elt.src);
        else if (tag == "link" || tag == "a")
            Win.openNewTab(elt.href);

        return true;
    },

    ignoreTarget: function(target)
    {
        // XXX: Temporary fix for issue 5577.
        var repNode = target && Firebug.getRepNode(target);
        return (repNode && repNode.classList.contains("cssRule"));
    },

    highlightObject: function(object, context, target)
    {
        if (this.ignoreTarget(target))
            return;
        Firebug.Inspector.highlightObject(object, context);
    },

    persistObject: function(elt, context)
    {
        var xpath = Xpath.getElementXPath(elt);

        return Obj.bind(this.persistor, window.top, xpath);
    },

    getTitle: function(element, context)
    {
        return Css.getElementCSSSelector(element);
    },

    getTooltip: function(elt, context, target)
    {
        // If the mouse cursor hovers over cropped value of an input element
        // display the full value in the tooltip.
        if (Css.hasClass(target, "objectBox-string"))
        {
            var inputValue = Dom.getAncestorByClass(target, "inputValue");
            if (inputValue)
            {
                var limit = Options.get("stringCropLength");
                var value;
                if (Css.hasClass(inputValue, "attributeValue"))
                    value = elt.getAttribute("value");
                else if (Css.hasClass(inputValue, "propertyValue"))
                    value = elt.value;

                if (value && value.length > limit)
                    return value;
            }
        }

        // Display xpath of the element.
        var tooltip = this.getXPath(elt);
        if (elt.namespaceURI)
            tooltip += " (" + elt.namespaceURI + ")";

        return tooltip;
    },

    getContextMenuItems: function(elt, target, context)
    {
        if (this.ignoreTarget(target))
            return;

        var type;
        var items = [];
        var clipboardContent = System.getStringDataFromClipboard();
        var isEltRoot = (elt === elt.ownerDocument.documentElement);

        if (Xml.isElementHTML(elt) || Xml.isElementXHTML(elt))
            type = "HTML";
        else if (Xml.isElementMathML(elt))
            type = "MathML";
        else if (Xml.isElementSVG(elt))
            type = "SVG";
        else if (Xml.isElementXUL(elt))
            type = "XUL";
        else
            type = "XML";

        items.push(
        {
            label: Locale.$STRF("html.Copy_Node", [type]),
            tooltiptext: Locale.$STRF("html.tip.Copy_Node", [type]),
            command: Obj.bindFixed(this.copyHTML, this, elt)
        });

        if (Xml.isElementHTML(elt) || Xml.isElementXHTML(elt))
        {
            items.push(
            {
                label: "CopyInnerHTML",
                tooltiptext: "html.tip.Copy_innerHTML",
                command: Obj.bindFixed(this.copyInnerHTML, this, elt)
            });
        }

        items = items.concat([
            {
                label: "CopyXPath",
                tooltiptext: "html.tip.Copy_XPath",
                id: "fbCopyXPath",
                command: Obj.bindFixed(this.copyXPath, this, elt)
            },
            {
                label: "Copy_CSS_Path",
                tooltiptext: "html.tip.Copy_CSS_Path",
                id: "fbCopyCSSPath",
                command: Obj.bindFixed(this.copyCSSPath, this, elt)
            },
            {
                label: Locale.$STRF("html.menu.Paste", [type]),
                tooltiptext: Locale.$STRF("html.tip.Paste", [type]),
                disabled: !clipboardContent,
                id: "fbPaste",
                items: [
                    {
                        label: "html.menu.Paste_Replace_Content",
                        tooltiptext: "html.tip.Paste_Replace_Content",
                        id: "fbPasteReplaceInner",
                        command: Obj.bindFixed(this.paste, this, elt, clipboardContent,
                            "replaceInner")
                    },
                    {
                        label: "html.menu.Paste_Replace_Node",
                        tooltiptext: "html.tip.Paste_Replace_Node",
                        id: "fbPasteReplaceOuter",
                        disabled: isEltRoot,
                        command: Obj.bindFixed(this.paste, this, elt, clipboardContent,
                            "replaceOuter")
                    },
                    {
                        label: "html.menu.Paste_AsFirstChild",
                        tooltiptext: "html.tip.Paste_AsFirstChild",
                        id: "fbPasteFirstChild",
                        command: Obj.bindFixed(this.paste, this, elt, clipboardContent,
                            "afterBegin")
                    },
                    {
                        label: "html.menu.Paste_AsLastChild",
                        tooltiptext: "html.tip.Paste_AsLastChild",
                        id: "fbPasteLastChild",
                        command: Obj.bindFixed(this.paste, this, elt, clipboardContent, "beforeEnd")
                    },
                    {
                        label: "html.menu.Paste_Before",
                        tooltiptext: "html.tip.Paste_Before",
                        id: "fbPasteBefore",
                        disabled: isEltRoot,
                        command: Obj.bindFixed(this.paste, this, elt, clipboardContent,
                            "beforeBegin")
                    },
                    {
                        label: "html.menu.Paste_After",
                        tooltiptext: "html.tip.Paste_After",
                        id: "fbPasteAfter",
                        disabled: isEltRoot,
                        command: Obj.bindFixed(this.paste, this, elt, clipboardContent, "afterEnd")
                    }
                ]
            }
        ]);

        var tag = elt.localName.toLowerCase();
        if (tag == "script" || tag == "link" || tag == "a" || tag == "img" || tag == "iframe" ||
            tag == "frame")
        {
            items = items.concat([
                "-",
                {
                    label: "OpenInTab",
                    tooltiptext: "firebug.tip.Open_In_Tab",
                    command: Obj.bindFixed(this.browseObject, this, elt, context)
                }
            ]);
        }

        if (tag == "iframe" || tag == "frame")
        {
            items = items.concat([
                {
                    label: "html.menu.Reload_Frame",
                    tooltiptext: "html.menu.tip.Reload_Frame",
                    command: Obj.bindFixed(this.reloadFrame, this, elt)
                }
            ]);
        }

        items = items.concat([
            "-",
            {
                label: "ScrollIntoView",
                tooltiptext: "html.tip.Scroll_Into_View",
                id: "fbScrollIntoView",
                command: Obj.bindFixed(elt.scrollIntoView, elt)
            }
        ]);

        return items;
    }
});

// ********************************************************************************************* //

FirebugReps.TextNode = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK(
            "&lt;",
            SPAN({"class": "nodeTag"}, "TextNode"),
            "&nbsp;textContent=&quot;",
            SPAN({"class": "nodeValue"}, "$object.textContent|cropMultipleLines"),
            "&quot;",
            "&gt;"
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "textNode",

    inspectObject: function(node, context)
    {
        // Text nodes have two displays in HTML panel, inline and distinct
        // node. We need to examine which case we are dealing with in order to
        // select the proper object.
        if (HTMLLib.hasNoElementChildren(node.parentNode))
        {
            node = node.parentNode;
        }

        Firebug.chrome.select(node, "html", "domSide");
    },

    supportsObject: function(object, type)
    {
        return object instanceof window.Text;
    },

    getTitle: function(win, context)
    {
        return "textNode";
    }
});

// ********************************************************************************************* //

FirebugReps.RegExp = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK(
            SPAN({"class": "objectTitle"}, "$object|getTitle"),
            SPAN("&nbsp;"),
            SPAN({"class": "regexpSource"}, "$object|getSource")
        ),

    className: "regexp",

    supportsObject: function(object, type)
    {
        try
        {
            return type == "object" && Object.prototype.toString.call(object) === "[object RegExp]";
        }
        catch (err)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("reps.RegExp.supportsObject; EXCEPTION " + err, err);
        }
    },

    getSource: function(object)
    {
        var source = "/" + object.source + "/";
        source += object.ignoreCase ? "i" : "";
        source += object.global ? "g" : "";
        source += object.multiline ? "m" : "";
        return source;
    }
});

// ********************************************************************************************* //

FirebugReps.Document = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK("Document ", SPAN({"class": "objectPropValue"}, "$object|getLocation")),

    getLocation: function(doc)
    {
        return doc.location ? Url.getFileName(doc.location.href) : "";
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "object",

    supportsObject: function(object, type)
    {
        return object instanceof window.Document || object instanceof window.XMLDocument;
    },

    browseObject: function(doc, context)
    {
        Win.openNewTab(doc.location.href);
        return true;
    },

    persistObject: function(doc, context)
    {
        return this.persistor;
    },

    persistor: function(context)
    {
        return context.window.document;
    },

    getTitle: function(win, context)
    {
        return "document";
    },

    getTooltip: function(doc)
    {
        return doc.location.href;
    }
});

// ********************************************************************************************* //

FirebugReps.StyleSheet = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK("StyleSheet ", SPAN({"class": "objectPropValue"}, "$object|getLocation")),

    getLocation: function(styleSheet)
    {
        return Url.getFileName(styleSheet.href);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    copyURL: function(styleSheet)
    {
        var url = Css.getURLForStyleSheet(styleSheet);
        if (url)
            System.copyToClipboard(url);

        if (FBTrace.DBG_ERRORS && !url)
            FBTrace.sysout("reps.StyleSheet.copyURL; ERROR no URL", styleSheet);
    },

    openInTab: function(styleSheet)
    {
        var url = Css.getURLForStyleSheet(styleSheet);
        if (url)
            Win.openNewTab(url);

        if (FBTrace.DBG_ERRORS && !url)
            FBTrace.sysout("reps.StyleSheet.openInTab; ERROR no URL", styleSheet);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "object",

    supportsObject: function(object, type)
    {
        return object instanceof window.CSSStyleSheet;
    },

    browseObject: function(styleSheet, context)
    {
        Win.openNewTab(styleSheet.href);
        return true;
    },

    persistObject: function(styleSheet, context)
    {
        return Obj.bind(this.persistor, top, styleSheet.href);
    },

    getTooltip: function(styleSheet)
    {
        return styleSheet.href;
    },

    getContextMenuItems: function(styleSheet, target, context)
    {
        return [
            {
                label: "CopyLocation",
                tooltiptext: "clipboard.tip.Copy_Location",
                command: Obj.bindFixed(this.copyURL, this, styleSheet)
            },
            "-",
            {
                label: "OpenInTab",
                tooltiptext: "firebug.tip.Open_In_Tab",
                command: Obj.bindFixed(this.openInTab, this, styleSheet)
            }
        ];
    },

    persistor: function(context, href)
    {
        return Css.getStyleSheetByHref(href, context);
    }
});

// ********************************************************************************************* //

FirebugReps.CSSRule = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK("$object|getType ", SPAN({"class": "objectPropValue"}, "$object|getDescription")),

    getType: function(rule)
    {
        if (rule instanceof window.CSSStyleRule)
        {
            return "CSSStyleRule";
        }
        else if (window.CSSSupportsRule && rule instanceof window.CSSSupportsRule)
        {
            return "CSSSupportsRule";
        }
        else if ((window.CSSDocumentRule && rule instanceof window.CSSDocumentRule) ||
            (window.CSSMozDocumentRule && rule instanceof window.CSSMozDocumentRule))
        {
            return "CSSDocumentRule";
        }
        else if (rule instanceof window.CSSFontFaceRule)
        {
            return "CSSFontFaceRule";
        }
        else if (rule instanceof window.CSSImportRule)
        {
            return "CSSImportRule";
        }
        else if (rule instanceof window.CSSMediaRule)
        {
            return "CSSMediaRule";
        }
        else if (rule instanceof window.CSSCharsetRule)
        {
            return "CSSCharsetRule";
        }
        else if ((window.CSSKeyframesRule && rule instanceof window.CSSKeyframesRule) ||
            rule instanceof window.MozCSSKeyframesRule)
        {
            return "CSSKeyframesRule";
        }
        else if ((window.CSSKeyframeRule && rule instanceof window.CSSKeyframeRule) ||
            rule instanceof window.MozCSSKeyframeRule)
        {
            return "CSSKeyframeRule";
        }
        else if (window.CSSPageRule && rule instanceof window.CSSPageRule)
        {
        	return "CSSPageRule";
        }
        else if (rule instanceof window.CSSNameSpaceRule)
        {
            return "CSSNameSpaceRule";
        }

        return "CSSRule";
    },

    getDescription: function(rule)
    {
        if (rule instanceof window.CSSStyleRule)
        {
            return rule.selectorText;
        }
        else if (window.CSSSupportsRule && rule instanceof window.CSSSupportsRule)
        {
            return rule.conditionText;
        }
        else if ((window.CSSDocumentRule && rule instanceof window.CSSDocumentRule) ||
            (window.CSSMozDocumentRule && rule instanceof window.CSSMozDocumentRule))
        {
            return rule.conditionText;
        }
        else if (rule instanceof window.CSSFontFaceRule)
        {
            return rule.style.getPropertyValue("font-family");
        }
        else if (rule instanceof window.CSSImportRule)
        {
            return Url.getFileName(rule.href);
        }
        else if (rule instanceof window.CSSMediaRule)
        {
            return rule.media.mediaText;
        }
        else if (rule instanceof window.CSSCharsetRule)
        {
            return rule.encoding;
        }
        else if ((window.CSSKeyframesRule && rule instanceof window.CSSKeyframesRule) ||
            rule instanceof window.MozCSSKeyframesRule)
        {
            return rule.name;
        }
        else if ((window.CSSKeyframeRule && rule instanceof window.CSSKeyframeRule) ||
            rule instanceof window.MozCSSKeyframeRule)
        {
            return rule.keyText;
        }
        else if (window.CSSPageRule && rule instanceof window.CSSPageRule)
        {
        	return rule.selectorText || "";
        }
        else if (rule instanceof window.CSSNameSpaceRule)
        {
            var reNamespace = /^@namespace (.+ )?url\("(.*?)"\);$/;
            var namespace = rule.cssText.match(reNamespace);
            var prefix = namespace[1] || "";
            var name = namespace[2];
            return prefix + name;
        }

        return "";
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "object",

    supportsObject: function(object, type)
    {
        return object instanceof window.CSSRule;
    },

    getTooltip: function(rule)
    {
        if (rule instanceof CSSFontFaceRule)
            return Css.extractURLs(rule.style.getPropertyValue("src")).join(", ");
        else if (rule instanceof window.CSSImportRule)
            return rule.href;

        return "";
    }
});

// ********************************************************************************************* //

FirebugReps.Window = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK("$object|getWindowTitle ",
            SPAN({"class": "objectPropValue"},
                "$object|getLocation"
            )
        ),

    getLocation: function(win)
    {
        try
        {
            return (win && win.location && !win.closed) ? Url.getFileName(win.location.href) : "";
        }
        catch (exc)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("reps.Window window closed? "+exc, exc);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "object",

    supportsObject: function(object, type)
    {
        return object instanceof window.Window;
    },

    browseObject: function(win, context)
    {
        Win.openNewTab(win.location.href);
        return true;
    },

    persistObject: function(win, context)
    {
        return this.persistor;
    },

    persistor: function(context)
    {
        return context.window;
    },

    getTitle: function(win, context)
    {
        return "window";
    },

    getWindowTitle: function(win)
    {
        if (Firebug.viewChrome)
        {
            if (win.toString().indexOf('XrayWrapper') !== -1)
                return "XrayWrapper[Window]";
        }
        return "Window";
    },

    getTooltip: function(win)
    {
        if (win && !win.closed)
            return win.location.href;
    }
});

// ********************************************************************************************* //

FirebugReps.Event = domplate(Firebug.Rep,
{
    className: "event",

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    tag:
        TAG("$copyEventTag", {object: "$object|copyEvent"}),

    copyEventTag:
        OBJECTLINK("$object|summarizeEvent"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    summarizeEvent: function(event)
    {
        var info = [event.type, " "];

        var eventFamily = Events.getEventFamily(event.type);
        if (eventFamily == "mouse")
            info.push("clientX=", event.clientX, ", clientY=", event.clientY);
        else if (eventFamily == "key")
            info.push("charCode=", event.charCode, ", keyCode=", event.keyCode);
        else if (event.type == "message")
            info.push("origin=", event.origin, ", data=", event.data);

        return info.join("");
    },

    copyEvent: function(event)
    {
        return new Dom.EventCopy(event);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    supportsObject: function(object, type)
    {
        return object instanceof window.Event || object instanceof Dom.EventCopy;
    },

    getTitle: function(event, context)
    {
        return "Event " + event.type;
    }
});

// ********************************************************************************************* //

FirebugReps.SourceLink = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK(
            {$collapsed: "$object|hideSourceLink"},
            DIV("$object|getSourceLinkTitle"),
            DIV({$systemLink: "$object|isSystemLink"}, "$object|getSystemFlagTitle")),

    isSystemLink: function(sourceLink)
    {
        return sourceLink && Url.isSystemURL(sourceLink.href);
    },

    hideSourceLink: function(sourceLink)
    {
        try
        {
            return (sourceLink && sourceLink.href && sourceLink.href.indexOf) ?
                (sourceLink.href.indexOf("XPCSafeJSObjectWrapper") != -1) : true;
        }
        catch (e)
        {
            // xxxHonza: I see "Security error" code: "1000" nsresult:
            // "0x805303e8 (NS_ERROR_DOM_SECURITY_ERR)"
            // when accessing globalStorage property of a page.
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("reps.hideSourceLink; EXCEPTION " + sourceLink + ", " + e, e);
        }

        return true;
    },

    getSourceLinkTitle: function(sourceLink)
    {
        if (!sourceLink || !sourceLink.href || typeof(sourceLink.href) !== 'string')
            return "";

        try
        {
            // XXX This is wrong for at least data: URLs. E.g. evaluating
            // "%2f" in the command line shows as "/".
            var fileName = sourceLink.href;
            fileName = Url.getFileName(fileName);
            fileName = decodeURIComponent(fileName);
        }
        catch(exc)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("reps.getSourceLinkTitle decodeURIComponent fails for \'" +
                    sourceLink.href + "\': " + exc, exc);
        }

        var maxWidth = Firebug.sourceLinkLabelWidth;
        if (maxWidth > 0)
            fileName = Str.cropString(fileName, maxWidth);

        if (sourceLink.instance)
        {
            return Locale.$STRF("InstanceLine", [fileName, sourceLink.instance + 1,
                sourceLink.line]);
        }
        else if (sourceLink.line && typeof(sourceLink.col) != "undefined")
        {
            return Locale.$STRF("LineAndCol", [fileName, sourceLink.line, sourceLink.col]);
        }
        else if (sourceLink.line)
        {
            return Locale.$STRF("Line", [fileName, sourceLink.line]);
        }
        else
        {
            return fileName;
        }
    },

    getSystemFlagTitle: function(sourceLink)
    {
        if (this.isSystemLink(sourceLink))
            return Locale.$STRF("SystemItem", [""]);
        else
            return "";
    },

    copyLink: function(sourceLink)
    {
        System.copyToClipboard(sourceLink.href);
    },

    openInTab: function(sourceLink)
    {
        Win.openNewTab(sourceLink.href);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "sourceLink",

    supportsObject: function(object, type)
    {
        return object instanceof SourceLink.SourceLink;
    },

    getTooltip: function(sourceLink)
    {
        var text;
        try
        {
            text = decodeURI(sourceLink.href);
        }
        catch(exc)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("reps.getTooltip decodeURI fails for " + sourceLink.href, exc);
        }

        text = unescape(sourceLink.href);

        var lines = Str.splitLines(text);
        if (lines.length < 10)
            return text;

        lines.splice(10);
        return lines.join("") + "...";
    },

    inspectObject: function(sourceLink, context)
    {
        if (sourceLink.type == "js")
        {
            var scriptFile = Firebug.SourceFile.getSourceFileByHref(sourceLink.href, context);
            if (scriptFile)
                return Firebug.chrome.select(sourceLink);
        }
        else if (sourceLink.type == "css")
        {
            // If an object is defined, treat it as the highest priority for
            // inspect actions
            if (sourceLink.object) {
                Firebug.chrome.select(sourceLink.object);
                return;
            }

            var stylesheet = Css.getStyleSheetByHref(sourceLink.href, context);
            if (stylesheet)
            {
                var ownerNode = stylesheet.ownerNode;
                if (ownerNode)
                {
                    Firebug.chrome.select(sourceLink, "html");
                    return;
                }

                var panel = context.getPanel("stylesheet");
                if (panel && panel.getRuleByLine(stylesheet, sourceLink.line))
                    return Firebug.chrome.select(sourceLink);
            }
        }
        else if (sourceLink.type == "net")
        {
            return Firebug.chrome.select(sourceLink);
        }

        // Fallback is to just open the view-source window on the file
        Firefox.viewSource(sourceLink.href, sourceLink.line);
    },

    browseObject: function(sourceLink, context)
    {
        Win.openNewTab(sourceLink.href);
        return true;
    },

    getContextMenuItems: function(sourceLink, target, context)
    {
        return [
            {
                label: "CopyLocation",
                tooltiptext: "clipboard.tip.Copy_Location",
                command: Obj.bindFixed(this.copyLink, this, sourceLink)
            },
            "-",
            {
                label: "OpenInTab",
                tooltiptext: "firebug.tip.Open_In_Tab",
                command: Obj.bindFixed(this.openInTab, this, sourceLink)
            }
        ];
    }
});

// ********************************************************************************************* //

FirebugReps.CompilationUnit = domplate(FirebugReps.SourceLink,
{
    tag:
        OBJECTLINK({$collapsed: "$object|hideSourceLink"}, "$object|getSourceLinkTitle"),

    persistor: function(context, href)
    {
        return context.getCompilationUnit(href);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "CompilationUnit",
    inspectable: false,

    supportsObject: function(object, type)
    {
       return (object instanceof CompilationUnit) ? 2 : 0;
    },

    persistObject: function(compilationUnit)
    {
        var href = compilationUnit.getURL();
        return Obj.bind(this.persistor, top, href);
    },

    browseObject: function(sourceLink, context)
    {
    },

    getTooltip: function(compilationUnit)
    {
        return compilationUnit.getURL();
    }
});

// ********************************************************************************************* //

// XXXjjb Since the repObject is fn the stack does not have correct line numbers
FirebugReps.StackFrame = domplate(Firebug.Rep,
{
    tag:
        OBJECTBLOCK({$hasTwisty: "$object|hasArguments", _repObject: "$object",
            onclick: "$onToggleArguments"},
            SPAN({"class":"stackFrameMarker"}, ""),
            A({"class": "objectLink a11yFocus", _repObject: "$object"}, "$object|getCallName"),
            SPAN("("),
            SPAN({"class": "arguments"},
                FOR("arg", "$object|argIterator",
                    SPAN({"class": "argName"}, "$arg.name"),
                    SPAN("="),
                    TAG("$arg.tag", {object: "$arg.value"}),
                    SPAN({"class": "arrayComma"}, "$arg.delim")
                )
            ),
            SPAN(")"),
            SPAN({"class": "objectLink-sourceLink objectLink a11yFocus",
                _repObject: "$object|getSourceLink",
                role: "link"},
                "$object|getSourceLinkTitle"),
            DIV({"class": "argList"})
        ),

    argList:
        DIV({"class": "argListBox", onclick: "$onSelectFrame"},
            FOR("arg", "$object|argIterator",
                DIV({"class": "argBox"},
                    SPAN({"class": "argName"}, "$arg.name"),
                    SPAN("&nbsp;=&nbsp;"),
                    TAG("$arg.tag", {object: "$arg.value"})
                )
            )
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    getTitle: function(frame)
    {
        return frame.getFunctionName();
    },

    hasArguments: function(frame)
    {
        return frame.args.length;
    },

    getCallName: function(frame)
    {
        return frame.getFunctionName();
    },

    getSourceLinkTitle: function(frame)
    {
        var fileName = Url.getFileName(frame.href);

        var maxWidth = Firebug.sourceLinkLabelWidth;
        if (maxWidth > 0)
            var fileName = Str.cropString(fileName, maxWidth);

        return Locale.$STRF("Line", [fileName, frame.line]);
    },

    argIterator: function(frame)
    {
        if (!frame.args)
            return [];

        var items = [];

        for (var i = 0; i < frame.args.length; ++i)
        {
            var arg = frame.args[i];

            if (!arg)
                break;

            if (arg.hasOwnProperty('value')) // then we got these from jsd
            {
                var rep = Firebug.getRep(arg.value);
                var tag = rep.shortTag ? rep.shortTag : rep.tag;

                var delim = (i == frame.args.length-1 ? "" : ", ");

                items.push({name: arg.name, value: arg.value, tag: tag, delim: delim});
            }
            else if (arg.hasOwnProperty('name'))
            {
                items.push({name: arg.name, delim: delim});
            }
            else  // eg from Error object
            {
                var delim = (i == frame.args.length-1 ? "" : ", ");
                var rep = Firebug.getRep(arg);
                var tag = rep.shortTag ? rep.shortTag : rep.tag;

                items.push({value: arg, tag: tag, delim: delim});
            }

            if (FBTrace.DBG_DOMPLATE)
                FBTrace.sysout("reps.stackframe args[" + i + "]: " + arg.name + " = " +
                    arg.value, {arg: arg, item: items[items.length - 1]});
        }

        return items;
    },

    getSourceLink: function(stackFrame)
    {
        var sourceLink = new SourceLink.SourceLink(stackFrame.href, stackFrame.line, "js");
        return sourceLink;
    },

    onToggleArguments: function(event)
    {
        this.toggleArguments(event.originalTarget);
    },

    toggleArguments: function(target)
    {
        if (Css.hasClass(target, "objectBox-stackFrame"))
        {
            if (Css.hasClass(target, "opened"))
                this.collapseArguments(target);
            else
                this.expandArguments(target);
        }
    },

    collapseArguments: function(target)
    {
        if (!Css.hasClass(target, "opened"))
            return;

        Css.toggleClass(target, "opened");

        var argList = target.getElementsByClassName("argList").item(0);
        Dom.clearNode(argList);
    },

    expandArguments: function(target)
    {
        if (Css.hasClass(target, "opened"))
            return;

        var frame = target.repObject;
        if (!this.hasArguments(frame))
            return;

        Css.toggleClass(target, "opened");

        var argList = target.getElementsByClassName("argList").item(0);
        this.argList.replace({object: frame}, argList);
    },

    onSelectFrame: function(event)
    {
        var target = event.currentTarget;
        if (Css.hasClass(target, "argListBox"))
        {
            var stackFrame = Dom.getAncestorByClass(target, "objectBox-stackFrame");
            var panel = Firebug.getElementPanel(target);
            this.inspectObject(stackFrame.repObject, panel.context);
            Events.cancelEvent(event);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Rep

    className: "stackFrame",

    supportsObject: function(object, type)
    {
        return object instanceof StackFrame.StackFrame;
    },

    inspectObject: function(stackFrame, context)
    {
        if (context.stopped)
            Firebug.chrome.select(stackFrame);
        else
            Firebug.chrome.select(this.getSourceLink(stackFrame));
    },

    getTooltip: function(stackFrame, context)
    {
        return Locale.$STRF("Line", [stackFrame.href, stackFrame.line]);
    }
});

// ********************************************************************************************* //

FirebugReps.StackTrace = domplate(Firebug.Rep,
{
    tag:
        DIV({role : "group", "aria-label" : Locale.$STR("aria.labels.stack trace")},
            FOR("frame", "$object.frames|frameIterator",
                TAG(FirebugReps.StackFrame.tag, {object: "$frame"})
            )
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "stackTrace",

    supportsObject: function(object, type)
    {
        return object instanceof StackFrame.StackTrace;
    },

    frameIterator: function(frames)
    {
        // Skip Firebug internal frames.
        // xxxHonza: this is another place where we peel off stack frames.
        var result = [];
        for (var i=0; frames && i<frames.length; i++)
        {
            var frame = frames[i];
            var sf = frame.sourceFile;
            if ((sf && sf.href && Str.hasPrefix(sf.href, "chrome")) ||
                (frame.fn === "_firebugRerun") ||
                (frame.fn === "jsdbug_NoScriptFunctionName") ||
                (frame.fn === "(debugger)"))
            {
                continue;
            }

            result.push(frames[i]);
        }
        return result;
    }
});

// ********************************************************************************************* //

// xxxsz: Is this code still in use?
FirebugReps.Assert = domplate(Firebug.Rep,
{
    tag:
        DIV(
            DIV({"class": "errorTitle"}),
            DIV({"class": "assertDescription"})
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "assert",

    inspectObject: function(error, context)
    {
        var sourceLink = this.getSourceLink(error);
        Firebug.chrome.select(sourceLink);
    },

    getContextMenuItems: function(error, target, context)
    {
        var breakOnThisError = this.hasErrorBreak(error);

        return [
            {
                label: "CopyError",
                tooltiptext: "console.tip.Copy_Error",
                command: Obj.bindFixed(this.copyError, this, error)
            },
            "-",
            {
                label: "BreakOnThisError",
                tooltiptext: "console.menu.tip.Break_On_This_Error",
                type: "checkbox",
                checked: breakOnThisError,
                command: Obj.bindFixed(this.breakOnThisError, this, error, context)
            },
            Menu.optionMenu("BreakOnAllErrors", "breakOnErrors",
                "console.menu.tip.Break_On_All_Errors")
        ];
    }
});

// ********************************************************************************************* //

FirebugReps.SourceText = domplate(Firebug.Rep,
{
    tag:
        DIV(
            FOR("line", "$object|lineIterator",
                DIV({"class": "sourceRow", role : "presentation"},
                    SPAN({"class": "sourceLine", role : "presentation"}, "$line.lineNo"),
                    SPAN({"class": "sourceRowText", role : "presentation"}, "$line.text")
                )
            )
        ),

    lineIterator: function(sourceText)
    {
        var maxLineNoChars = (sourceText.lines.length + "").length;
        var list = [];

        for (var i = 0; i < sourceText.lines.length; ++i)
        {
            // Make sure all line numbers are the same width (with a fixed-width font)
            var lineNo = (i+1) + "";
            while (lineNo.length < maxLineNoChars)
                lineNo = " " + lineNo;

            list.push({lineNo: lineNo, text: sourceText.lines[i]});
        }

        return list;
    },

    getHTML: function(sourceText)
    {
        return getSourceLineRange(sourceText, 1, sourceText.lines.length);
    }
});

//********************************************************************************************** //

FirebugReps.nsIDOMHistory = domplate(Firebug.Rep,
{
    tag:
        OBJECTBOX({onclick: "$showHistory", _repObject: "$object"},
            OBJECTLINK("$object|summarizeHistory")
        ),

    className: "nsIDOMHistory",

    summarizeHistory: function(history)
    {
        try
        {
            var items = history.length;
            return Locale.$STRP("firebug.reps.historyEntries", [items]);
        }
        catch (exc)
        {
            return "object does not support history (nsIDOMHistory)";
        }
    },

    showHistory: function(event)
    {
        try
        {
            var history = event.currentTarget.repObject;
            history.length;  // if this throws, then unsupported
            Firebug.chrome.select(history);
        }
        catch (exc)
        {
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    supportsObject: function(object, type)
    {
        return (object instanceof Ci.nsIDOMHistory);
    }
});

// ********************************************************************************************* //

FirebugReps.ApplicationCache = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK("$object|summarizeCache"),

    summarizeCache: function(applicationCache)
    {
        try
        {
            return applicationCache.mozItems.length + " items in offline cache";
        }
        catch(exc)
        {
            return "https://bugzilla.mozilla.org/show_bug.cgi?id=422264";
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "applicationCache",

    supportsObject: function(object, type)
    {
        if (Ci.nsIDOMOfflineResourceList)
            return (object instanceof Ci.nsIDOMOfflineResourceList);
    }
});

// ********************************************************************************************* //

FirebugReps.Storage = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK(
            SPAN({"class": "storageTitle"}, "$object|summarize "),
            FOR("prop", "$object|longPropIterator",
                "$prop.name",
                SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
                TAG("$prop.tag", {object: "$prop.object"}),
                SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
            )
        ),

    shortTag:
        OBJECTLINK(
            SPAN({"class": "storageTitle"}, "$object|summarize "),
            FOR("prop", "$object|shortPropIterator",
                "$prop.name",
                SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
                TAG("$prop.tag", {object: "$prop.object"}),
                SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
            )
        ),

    summarize: function(storage)
    {
        var object = this.objectView(storage);
        return Locale.$STRP("firebug.storage.totalItems", [Object.keys(object).length]);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "Storage",

    supportsObject: function(object, type)
    {
        return (object instanceof window.Storage);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Iterator

    longPropIterator: function(object)
    {
        return this.propIterator(object, 100);
    },

    shortPropIterator: function(object)
    {
        return this.propIterator(object, Options.get("ObjectShortIteratorMax"));
    },

    propIterator: function(storage, max)
    {
        var object = this.objectView(storage);
        return FirebugReps.Obj.propIterator(object, max);
    },

    objectView: function(storage)
    {
        var object = this.makeObject(storage);
        for (var any in object)
            return object;

        // We might have hit upon an https site (bug 709238).
        // As a hack, we'll check if the current context's window
        // contains the object as localStorage or sessionStorage.
        try {
            var context = Firebug.currentContext;
            var win = context && context.window;
            if (win && win.location.protocol === "https:")
            {
                var names = ["localStorage", "sessionStorage"], done = false;
                for (var i = 0; i < 2; ++i)
                {
                    if (win[names[i]] !== storage)
                        continue;
                    Firebug.CommandLine.evaluate(
                        "((" + this.makeObject + ")(" + names[i] + "))",
                        context,
                        null, null,
                        function(result) {
                            object = result;
                            done = true;
                        },
                        function() {},
                        true
                    );
                    if (done)
                        break;
                }
            }
        }
        catch(e)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("reps.Storage.objectView; EXCEPTION " + e, e);
        }

        return object;
    },

    makeObject: function(storage)
    {
        // Create a raw object, free from getItem etc., from a storage.
        // May be serialized and run in page scope.
        var object = {};
        try
        {
            for (var name in storage)
            {
                var value = storage.getItem(name);
                Object.defineProperty(object, name, {value: value, enumerable: true});
            }
        }
        catch(e)
        {
            // We can't log an error in page scope.
        }
        return object;
    }
});

// ********************************************************************************************* //

FirebugReps.XPathResult = domplate(FirebugReps.Arr,
{
    className: "array xPathResult",
    toggles: new ToggleBranch.ToggleBranch(),

    tag:
        SPAN(FirebugReps.Arr.tag),

    shortTag:
        SPAN(FirebugReps.Arr.shortTag),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    hasSpecialProperties: function(array)
    {
        // xxxHonza: fix for test console/api/log-xpathresult
        // FirebugReps.Arr.hasSpecialProperties iterates object properties
        // (using Object.getOwnPropertyNames), but misses 'constructor' if the property
        // is not explicitely accessed before. Any explanation for such behavior?
        // (btw. it was actually accessed, but order of 'supportsObject' calls changed when
        // 'Exception' rep moved into its own module, see issue: 6606)
        var ctor = array && array.constructor;
        return FirebugReps.Arr.hasSpecialProperties.apply(this, arguments);
    },

    supportsObject: function(xpathresult, type)
    {
        return (xpathresult instanceof window.XPathResult);
    },

    arrayIterator: function(xpathresult, max)
    {
        var items = [];
        for (var i=0; i<xpathresult.snapshotLength && i<=max; i++)
        {
            var value = xpathresult.snapshotItem(i);
            var rep = Firebug.getRep(value);
            var tag = rep.shortTag || rep.tag;
            var delim = (i == xpathresult.snapshotLength-1 ? "" : ", ");

            items.push({object: value, tag: tag, delim: delim});
        }

        if (xpathresult.snapshotLength > max + 1)
        {
            items[max] = {
                object: (xpathresult.snapshotLength-max) + " " +
                    Locale.$STR("firebug.reps.more") + "...",
                tag: FirebugReps.Caption.tag,
                delim: ""
            };
        }

        return items;
    },
});

// ********************************************************************************************* //

FirebugReps.Description = domplate(Firebug.Rep,
{
    className: "Description",

    // Use SPAN to make sure the description is nicely inserted into existing text inline.
    tag:
        SPAN({"class": "descriptionBox", onclick: "$onClickLink"}),

    render: function(text, parentNode, listener)
    {
        var params = {};
        params.onClickLink = function(event)
        {
            // Only clicks on links are passed to the original listener.
            var localName = event.target.localName;
            if (listener && localName && localName.toLowerCase() == "a")
                listener(event);
        };

        var rootNode = this.tag.replace(params, parentNode, this);

        var parser = Xpcom.CCIN("@mozilla.org/xmlextras/domparser;1", "nsIDOMParser");
        var doc = parser.parseFromString("<div>" + text + "</div>", "text/xml");
        var root = doc.documentElement;

        // Error handling
        var nsURI = "http://www.mozilla.org/newlayout/xml/parsererror.xml";
        if (root.namespaceURI == nsURI && root.nodeName == "parsererror")
        {
            FBTrace.sysout("reps.Description; parse ERROR " + root.firstChild.nodeValue, root);

            return FirebugReps.Warning.tag.replace({object: "css.EmptyElementCSS"},
                parentNode, FirebugReps.Warning);
        }

        // Nodes from external documents need to be imported.
        root = rootNode.ownerDocument.importNode(root, true);

        rootNode.appendChild(root);
        return rootNode;
    }
});

// ********************************************************************************************* //

FirebugReps.Attr = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK(
            SPAN(
                SPAN({"class": "attrTitle"}, "$object|getTitle"),
                SPAN({"class": "attrEqual"}, "="),
                TAG("$object|getValueTag", {object: "$object.value"})
            )
        ),

    getTitle: function(attr)
    {
        return attr.name;
    },

    getValueTag: function(object)
    {
        return Firebug.getRep(object.value).tag;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "Attr",

    supportsObject: function(object, type)
    {
        return (object instanceof window.Attr);
    },
});

// ********************************************************************************************* //

FirebugReps.Date = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK(
            SPAN({"class": "objectTitle"}, "$object|getTitle "),
            SPAN({"class": "objectLeftBrace", role: "presentation"}, "{"),
            SPAN({"class": "attrEqual"}, "$object|getValue"),
            SPAN({"class": "objectRightBrace"}, "}")
        ),

    getValue: function(object)
    {
        return object.toString();
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "Date",

    supportsObject: function(object, type)
    {
        return object && object.constructor && object.constructor.name == "Date";
    },
});

// ********************************************************************************************* //

FirebugReps.NamedNodeMap = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK(
            SPAN({"class": "arrayLeftBracket", role: "presentation"}, "["),
            FOR("prop", "$object|longPropIterator",
                SPAN({"class": "nodeName"}, "$prop.name"),
                SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
                TAG("$prop.tag", {object: "$prop.object"}),
                SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
            ),
            SPAN({"class": "arrayRightBracket", role: "presentation"}, "]")
        ),

    shortTag:
        OBJECTLINK(
            SPAN({"class": "arrayLeftBracket", role: "presentation"}, "["),
            FOR("prop", "$object|shortPropIterator",
                SPAN({"class": "nodeName"}, "$prop.name"),
                SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
                TAG("$prop.tag", {object: "$prop.object"}),
                SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
            ),
            SPAN({"class": "arrayRightBracket", role: "presentation"}, "]")
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "NamedNodeMap",

    supportsObject: function(object, type)
    {
        // NamedNodeMap is no more since Fx 22 - see https://bugzilla.mozilla.org/show_bug.cgi?id=847195.
        // The temporary Attr-only replacement is MozNamedAttrMap.
        return (object instanceof (window.NamedNodeMap || window.MozNamedAttrMap));
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Iterator

    longPropIterator: function(object)
    {
        return this.propIterator(object, 100);
    },

    shortPropIterator: function(object)
    {
        return this.propIterator(object, Options.get("ObjectShortIteratorMax"));
    },

    propIterator: function (object, max)
    {
        max = max || 3;
        if (!object)
            return [];

        var props = [];
        for (var i=0; i<object.length && i<max; i++)
        {
            var item = object.item(i);
            var name = item.name;
            var value = item.value;

            var rep = Firebug.getRep(value);
            var tag = rep.tag;

            props.push({tag: tag, name: name, object: value, equal: "=", delim: ", "});
        }

        if (object.length > max)
        {
            var index = max - 1, more = object.length - max + 1;
            if (index < 1)
            {
                index = 1;
                more++;
            }
            props[index] = {
                object: more + " " + Locale.$STR("firebug.reps.more") + "...",
                tag: FirebugReps.Caption.tag,
                name: "",
                equal: "",
                delim: ""
            };
        }
        else if (props.length > 0)
        {
            props[props.length-1].delim = '';
        }

        return props;
    },
});

//********************************************************************************************** //

FirebugReps.ClosureScope = domplate(Firebug.Rep,
{
    tag: OBJECTBOX({_repObject: "$object"}, "$object|getTitle"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "scope",

    getTitle: function(object)
    {
        var scope = ClosureInspector.getScopeFromWrapper(object);
        var type = scope.type, title;
        if (type === "declarative")
            title = Locale.$STR("firebug.reps.declarativeScope");
        else if (type === "object")
            title = Locale.$STR("firebug.reps.objectScope");
        else if (type === "with")
            title = Locale.$STR("firebug.reps.withScope");
        else
            title = "<unknown scope \"" + type + "\">"; // shouldn't happen
        return title;
    },

    supportsObject: function(object, type)
    {
        return ClosureInspector.isScopeWrapper(object);
    }
});

// ********************************************************************************************* //

FirebugReps.OptimizedAway = domplate(Firebug.Rep,
{
    tag: OBJECTBOX({_repObject: "$object"}, "$object|getTitle"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    className: "optimizedAway",

    getTitle: function(object)
    {
        return Locale.$STR("firebug.reps.optimizedAway");
    },

    supportsObject: function(object, type)
    {
        return ClosureInspector.isOptimizedAway(object);
    }
});

// ********************************************************************************************* //
// Registration

Firebug.registerRep(
    FirebugReps.Undefined,
    FirebugReps.Null,
    FirebugReps.Number,
    FirebugReps.SpecialWhitespaceString,
    FirebugReps.String,
    FirebugReps.nsIDOMHistory, // make this early to avoid exceptions
    FirebugReps.ApplicationCache, // this also
    FirebugReps.RegExp,
    FirebugReps.Window,
    FirebugReps.Element,
    FirebugReps.TextNode,
    FirebugReps.Document,
    FirebugReps.StyleSheet,
    FirebugReps.CSSRule,
    FirebugReps.Event,
    FirebugReps.SourceLink,
    FirebugReps.CompilationUnit,
    FirebugReps.StackTrace,
    FirebugReps.StackFrame,
    FirebugReps.NetFile,
    FirebugReps.Property,
    FirebugReps.XML,
    FirebugReps.Arr,
    FirebugReps.ArrayLikeObject,
    FirebugReps.XPathResult,
    FirebugReps.Storage,
    FirebugReps.Attr,
    FirebugReps.Date,
    FirebugReps.NamedNodeMap,
    FirebugReps.Reference,
    FirebugReps.ClosureScope,
    FirebugReps.OptimizedAway
);

Firebug.setDefaultReps(FirebugReps.Func, FirebugReps.Obj);

return Firebug.Reps = FirebugReps;

// ********************************************************************************************* //
}});
