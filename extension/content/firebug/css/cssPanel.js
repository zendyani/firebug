/* See license.txt for terms of usage */

define([
    "firebug/lib/object",
    "firebug/firebug",
    "firebug/lib/domplate",
    "firebug/chrome/reps",
    "firebug/lib/locale",
    "firebug/lib/events",
    "firebug/lib/url",
    "firebug/js/sourceLink",
    "firebug/lib/css",
    "firebug/lib/dom",
    "firebug/chrome/window",
    "firebug/lib/search",
    "firebug/lib/string",
    "firebug/lib/array",
    "firebug/lib/fonts",
    "firebug/lib/xml",
    "firebug/lib/persist",
    "firebug/lib/system",
    "firebug/chrome/menu",
    "firebug/lib/options",
    "firebug/css/cssModule",
    "firebug/css/cssReps",
    "firebug/css/selectorEditor",
    "firebug/lib/trace",
    "firebug/css/cssPanelUpdater",
    "firebug/lib/wrapper",
    "firebug/editor/editor",
    "firebug/editor/editorSelector",
    "firebug/chrome/searchBox",
    "firebug/css/cssPanelMutationObserver",
],
function(Obj, Firebug, Domplate, FirebugReps, Locale, Events, Url, SourceLink, Css, Dom, Win,
    Search, Str, Arr, Fonts, Xml, Persist, System, Menu, Options, CSSModule, CSSInfoTip,
    SelectorEditor, FBTrace, CSSPanelUpdater, Wrapper) {

with (Domplate) {

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

var CSSDomplateBase =
{
    isEditable: function(rule)
    {
        return !rule.isSystemSheet && !rule.isNotEditable;
    },

    isSelectorEditable: function(rule)
    {
        return rule.isSelectorEditable && this.isEditable(rule);
    },

    getPropertyValue: function(prop)
    {
        // Disabled, see http://code.google.com/p/fbug/issues/detail?id=5880
        /*
        var limit = Options.get("stringCropLength");
        */
        var limit = 0;
        if (limit > 0)
            return Str.cropString(prop.value, limit);
        return prop.value;
    }
};

var CSSPropTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssProp focusRow", $disabledStyle: "$prop.disabled",
            $editGroup: "$rule|isEditable",
            $cssOverridden: "$prop.overridden",
            role: "option"},

            // Use spaces for indent to make "copy to clipboard" nice.
            SPAN({"class": "cssPropIndent"}, "&nbsp;&nbsp;&nbsp;&nbsp;"),
            SPAN({"class": "cssPropName", $editable: "$rule|isEditable"},
                "$prop.name"
            ),

            // Use a space here, so that "copy to clipboard" has it (issue 3266).
            SPAN({"class": "cssColon"}, ": "),
            SPAN({"class": "cssPropValue", $editable: "$rule|isEditable"},
                "$prop|getPropertyValue$prop.important"
            ),
            SPAN({"class": "cssSemi"}, ";")
        )
});

var CSSRuleTag =
    TAG("$rule.tag", {rule: "$rule"});

var CSSImportRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule insertInto focusRow importRule", _repObject: "$rule.rule"},
        "@import &quot;",
        A({"class": "objectLink", _repObject: "$rule.rule.styleSheet"}, "$rule.rule.href"),
        "&quot;",
        SPAN({"class": "separator"}, "$rule.rule|getSeparator"),
        SPAN({"class": "cssMediaQuery", $editable: "$rule|isEditable"},
            "$rule.rule.media.mediaText"),
        ";"
    ),

    getSeparator: function(rule)
    {
        return rule.media.mediaText == "" ? "" : " ";
    }
});

var CSSCharsetRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule focusRow cssCharsetRule", _repObject: "$rule.rule"},
            SPAN({"class": "cssRuleName"}, "@charset"),
            "&nbsp;&quot;",
            SPAN({"class": "cssRuleValue", $editable: "$rule|isEditable"}, "$rule.rule.encoding"),
            "&quot;;"
        )
});

var CSSMediaRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule focusRow cssMediaRule", _repObject: "$rule.rule"},
            DIV({"class": "cssHead focusRow", role : "listitem"},
                SPAN({"class": "cssRuleName"}, "@media"),
                SPAN({"class": "separator"}, " "),
                SPAN({"class": "cssMediaRuleCondition", $editable: "$rule|isEditable"},
                    "$rule.rule.conditionText"),
                SPAN(" {")
            ),
            DIV({"class": "cssRulesListBox", role: "listbox"},
                FOR("subRule", "$rule.subRules",
                    TAG("$subRule.tag", {rule: "$subRule"})
                )
            ),
            DIV({$editable: "$rule|isEditable", $insertBefore:"$rule|isEditable",
                role:"presentation"},
                "}")
        )
});

var CSSSupportsRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule focusRow cssSupportsRule", _repObject: "$rule.rule"},
            DIV({"class": "cssHead focusRow", role : "listitem"},
                SPAN({"class": "cssRuleName"}, "@supports"),
                SPAN({"class": "separator"}, " "),
                SPAN({"class": "cssSupportsRuleCondition", $editable: "$rule|isEditable"},
                "$rule.rule.conditionText"),
                SPAN(" {")
            ),
            DIV({"class": "cssRulesListBox", role: "listbox"},
                FOR("subRule", "$rule.subRules",
                    TAG("$subRule.tag", {rule: "$subRule"})
                )
            ),
            DIV({$editable: "$rule|isEditable", $insertBefore:"$rule|isEditable",
                role:"presentation"},
            "}")
        )
});

var CSSKeyframesRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule focusRow cssKeyframesRule", _repObject: "$rule.rule"},
            DIV({"class": "cssHead focusRow", role : "listitem"},
                SPAN({"class": "cssRuleName"}, "@-moz-keyframes"),
                SPAN({"class": "separator"}, " "),
                SPAN({"class": "cssKeyframesRuleName", $editable: "$rule|isEditable"},
                "$rule.rule.name"),
                SPAN(" {")
            ),
            DIV({"class": "cssRulesListBox", role: "listbox"},
                FOR("subRule", "$rule.subRules",
                    TAG("$subRule.tag", {rule: "$subRule"})
                )
            ),
            DIV({role:"presentation"},
            "}")
        )
});

var CSSKeyframeRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule",
                $cssEditableRule: "$rule|isEditable",
                $insertInto: "$rule|isEditable",
                $editGroup: "$rule|isSelectorEditable",
                _repObject: "$rule.rule",
                role: "presentation"},
            DIV({"class": "cssHead focusRow", role: "listitem"},
                SPAN({"class": "cssKeyText", $editable: "$rule|isEditable"},
                    "$rule.rule.keyText"),
                " {"
            ),
            DIV({role: "group"},
                DIV({"class": "cssPropertyListBox", _rule: "$rule", role: "listbox"},
                    FOR("prop", "$rule.props",
                        TAG(CSSPropTag.tag, {rule: "$rule", prop: "$prop"})
                    )
                )
            ),
            DIV({$editable: "$rule|isEditable", $insertBefore: "$rule|isEditable",
                role:"presentation"},
                "}"
            )
        )
});

var CSSNamespaceRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule focusRow cssNamespaceRule", _repObject: "$rule.rule"},
            SPAN({"class": "cssRuleName"}, "@namespace"),
            SPAN({"class": "separator"}, "$rule.prefix|getSeparator"),
            SPAN({"class": "cssNamespacePrefix", $editable: "$rule|isEditable"}, "$rule.prefix"),
            "&nbsp;&quot;",
            SPAN({"class": "cssNamespaceName", $editable: "$rule|isEditable"}, "$rule.name"),
            "&quot;;"
        ),

    getSeparator: function(prefix)
    {
        return prefix == "" ? "" : " ";
    }
});

var CSSFontFaceRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule cssFontFaceRule",
            $cssEditableRule: "$rule|isEditable",
            $insertInto: "$rule|isEditable",
            _repObject: "$rule.rule",
            role : 'presentation'},
            DIV({"class": "cssHead focusRow", role : "listitem"}, "@font-face {"),
            DIV({role : "group"},
                DIV({"class": "cssPropertyListBox", role: "listbox"},
                    FOR("prop", "$rule.props",
                        TAG(CSSPropTag.tag, {rule: "$rule", prop: "$prop"})
                    )
                )
            ),
            DIV({$editable: "$rule|isEditable", $insertBefore:"$rule|isEditable",
                role:"presentation"},
                "}"
            )
        )
});

var CSSPageRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule focusRow cssPageRule", _repObject: "$rule.rule"},
            DIV({"class": "cssHead focusRow", role : "listitem"},
                SPAN({"class": "cssRuleName"}, "@page"),
                SPAN({"class": "separator"}, "$rule.selectorText|getSeparator"),
                SPAN({"class": "cssPageRuleSelector", $editable: "$rule|isEditable"},
                    "$rule.selectorText|getSelectorText"),
                SPAN(" {")
            ),
            DIV({role : "group"},
                DIV({"class": "cssPropertyListBox", role: "listbox"},
                    FOR("prop", "$rule.props",
                        TAG(CSSPropTag.tag, {rule: "$rule", prop: "$prop"})
                    )
                )
            ),
            DIV({$editable: "$rule|isEditable", $insertBefore:"$rule|isEditable",
                role:"presentation"},
                "}")
        ),

    getSeparator: function(selector)
    {
        return (!selector || selector == "") ? "" : " ";
    },

    getSelectorText: function(selector)
    {
        return selector || "";
    }
});

var CSSDocumentRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule focusRow cssDocumentRule", _repObject: "$rule.rule"},
            DIV({"class": "cssHead focusRow", role : "listitem"},
                SPAN({"class": "cssRuleName"}, "@-moz-document"),
                SPAN({"class": "separator"}, " "),
                SPAN({"class": "cssDocumentRuleCondition", $editable: "$rule|isEditable"},
                "$rule.rule.conditionText"),
                SPAN(" {")
            ),
            DIV({"class": "cssRulesListBox", role: "listbox"},
                FOR("subRule", "$rule.subRules",
                    TAG("$subRule.tag", {rule: "$subRule"})
                )
            ),
            DIV({$editable: "$rule|isEditable", $insertBefore:"$rule|isEditable",
                role:"presentation"},
            "}")
        )
});

var CSSStyleRuleTag = domplate(CSSDomplateBase,
{
    tag:
        DIV({"class": "cssRule",
            $cssEditableRule: "$rule|isEditable",
            $insertInto: "$rule|isEditable",
            $editGroup: "$rule|isSelectorEditable",
            _repObject: "$rule.rule",
            role: "presentation"},
            DIV({"class": "cssHead focusRow", role: "listitem"},
                SPAN({"class": "cssSelector", $editable: "$rule|isSelectorEditable"},
                    "$rule.selector"),
                " {"
            ),
            DIV({role: "group"},
                DIV({"class": "cssPropertyListBox", _rule: "$rule", role: "listbox"},
                    FOR("prop", "$rule.props",
                        TAG(CSSPropTag.tag, {rule: "$rule", prop: "$prop"})
                    )
                )
            ),
            DIV({$editable: "$rule|isEditable", $insertBefore: "$rule|isEditable",
                role:"presentation"},
                "}"
            )
        )
});

Firebug.CSSStyleRuleTag = CSSStyleRuleTag;

// ********************************************************************************************* //

const reSplitCSS = /(url\("?[^"\)]+?"?\))|(rgba?\([^)]*\)?)|(hsla?\([^)]*\)?)|(#[\dA-Fa-f]+)|(-?\d+(\.\d+)?(%|[a-z]{1,4})?)|"([^"]*)"?|'([^']*)'?|([^,\s\/!\(\)]+)|(!(.*)?)/;
const reURL = /url\("?([^"\)]+)?"?\)/;
const reRepeat = /no-repeat|repeat-x|repeat-y|repeat/;

// ********************************************************************************************* //
// CSSStyleSheetPanel (CSS Panel)

/**
 * @panel Represents the CSS panel available in main Firebug UI. This panel is responsible
 * for displaying CSS rules coming from the current page.
 * See more: https://getfirebug.com/wiki/index.php/CSS_Panel
 */
Firebug.CSSStyleSheetPanel = function() {};
Firebug.CSSStyleSheetPanel.prototype = Obj.extend(Firebug.Panel,
/** @lends Firebug.CSSStyleSheetPanel */
{
    name: "stylesheet",
    parentPanel: null,
    searchable: true,
    dependents: ["css", "stylesheet", "dom", "domSide", "layout"],
    enableA11y: true,
    deriveA11yFrom: "css",
    order: 30,

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    template: domplate(
    {
        tag:
            DIV({"class": "cssSheet insertInto a11yCSSView"},
                FOR("rule", "$rules",
                    CSSRuleTag
                ),
                DIV({"class": "cssSheet editable insertBefore"}, ""
                )
            )
    }),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Initialization

    initialize: function()
    {
        this.onMouseDown = Obj.bind(this.onMouseDown, this);
        this.onMouseUp = Obj.bind(this.onMouseUp, this);
        this.onClick = Obj.bind(this.onClick, this);

        Firebug.Panel.initialize.apply(this, arguments);

        // Create an updater for asynchronous update (watching embedded iframe loads).
        var callback = this.updateDefaultLocation.bind(this);
        this.updater = new CSSPanelUpdater(this.context, callback);
    },

    destroy: function(state)
    {
        state.scrollTop = this.panelNode.scrollTop ? this.panelNode.scrollTop : this.lastScrollTop;

        Persist.persistObjects(this, state);

        this.stopEditing();

        if (this.updater)
            this.updater.destroy();

        Firebug.Panel.destroy.apply(this, arguments);
    },

    initializeNode: function(oldPanelNode)
    {
        Events.addEventListener(this.panelNode, "mousedown", this.onMouseDown, false);
        Events.addEventListener(this.panelNode, "mouseup", this.onMouseUp, false);
        Events.addEventListener(this.panelNode, "click", this.onClick, false);

        Firebug.Panel.initializeNode.apply(this, arguments);
    },

    destroyNode: function()
    {
        Events.removeEventListener(this.panelNode, "mousedown", this.onMouseDown, false);
        Events.removeEventListener(this.panelNode, "mouseup", this.onMouseUp, false);
        Events.removeEventListener(this.panelNode, "click", this.onClick, false);

        Firebug.Panel.destroyNode.apply(this, arguments);
    },

    show: function(state)
    {
        Firebug.Inspector.stopInspecting(true);

        this.showToolbarButtons("fbCSSButtons", true);
        this.showToolbarButtons("fbLocationSeparator", true);
        this.showToolbarButtons("fbLocationButtons", true);
        this.showToolbarButtons("fbLocationList", true);

        CSSModule.updateEditButton();

        // wait for loadedContext to restore the panel
        if (this.context.loaded && !this.location)
        {
            Persist.restoreObjects(this, state);

            if (!this.location)
                this.location = this.getDefaultLocation();

            if (state && state.scrollTop)
                this.panelNode.scrollTop = state.scrollTop;
        }

        // Solves the problem when the current stylesheet (i.e. the current panel location)
        // has been removed from the page (or the parent window/iframe has been removed).
        // In such case we need to update the panel content.
        if (!this.isValidStyleSheet(this.location))
            this.navigate(null);
    },

    hide: function()
    {
        this.lastScrollTop = this.panelNode.scrollTop;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    isValidStyleSheet: function(styleSheet)
    {
        if (!styleSheet)
            return false;

        if (Wrapper.isDeadWrapper(styleSheet))
            return false;

        if (!styleSheet.ownerNode)
            return false;

        return true;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // TabWatcher

    unwatchWindow: function(context, win)
    {
        // The update happens only if the CSS panel is selected. If the current location
        // style sheet is removed while the panel is not selected, the content will be
        // updated when 'show' method is executed by the framework.
        var panel = Firebug.chrome.getSelectedPanel();
        if (!panel || panel.name != "stylesheet")
            return;

        // We need to check whether the current location (a stylesheet) has been
        // unloaded together with the window.
        if (this.location)
        {
            var ownerNode = this.location.ownerNode;
            var styleSheetDoc = ownerNode ? ownerNode.ownerDocument : null;
            if (styleSheetDoc == win.document)
            {
                this.location = null;
                this.updateDefaultLocation();
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Default Location Update

    /**
     * Executed automatically by {@CSSPanelUpdater} object that is watching window/iframe load.
     */
    updateDefaultLocation: function()
    {
        if (FBTrace.DBG_CSS)
            FBTrace.sysout("cssPanel.updateDefaultLocation; " + this.location, this.location);

        // Try to update the default location if it doesn't exist yet.
        if (!this.location)
        {
            var defaultLocation = this.getDefaultLocation();

            // Still no default location so, keep the updater running.
            if (!defaultLocation)
                return;

            if (FBTrace.DBG_CSS)
                FBTrace.sysout("cssPanel.updateDefaultLocation; DONE", defaultLocation);

            // Use navigate so, the location button visibility is properly updated.
            this.navigate(defaultLocation);
        }
        else
        {
            // The location is set so just make sure to update the content.
            this.updateLocation(this.location);
        }

        if (this.updater)
        {
            // Default location exists so destroy the updater.
            this.updater.destroy();
            this.updater = null;
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    refresh: function()
    {
        if (this.location)
            this.updateLocation(this.location);
        else if (this.selection)
            this.updateSelection(this.selection);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // CSS Editing

    startBuiltInEditing: function(css)
    {
        if (FBTrace.DBG_CSS)
            FBTrace.sysout("CSSStyleSheetPanel.startBuiltInEditing", css);

        if (!this.stylesheetEditor)
            this.stylesheetEditor = new StyleSheetEditor(this.document);

        var styleSheet = this.location.editStyleSheet
            ? this.location.editStyleSheet.sheet
            : this.location;

        this.stylesheetEditor.styleSheet = this.location;
        Firebug.Editor.startEditing(this.panelNode, css, this.stylesheetEditor);

        //this.stylesheetEditor.scrollToLine(topmost.line, topmost.offset);
        this.stylesheetEditor.input.scrollTop = this.panelNode.scrollTop;
    },

    startLiveEditing: function(styleSheet, context)
    {
        var css = getStyleSheetCSS(styleSheet, context);
        this.startBuiltInEditing(css);
    },

    startSourceEditing: function(styleSheet, context)
    {
        if (Firebug.CSSDirtyListener.isDirty(styleSheet, context))
        {
            var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].
                getService(Ci.nsIPromptService);

            var proceedToEdit = prompts.confirm(null, Locale.$STR("Firebug"),
                Locale.$STR("confirmation.Edit_CSS_Source"));

            if (!proceedToEdit)
            {
                this.stopEditing();
                return;
            }
        }

        var css = getOriginalStyleSheetCSS(styleSheet, context);
        this.startBuiltInEditing(css);
    },

    stopEditing: function()
    {
        if (FBTrace.DBG_CSS)
            FBTrace.sysout("CSSStyleSheetPanel.stopEditing");

        if (this.currentCSSEditor)
        {
            this.currentCSSEditor.stopEditing();
            delete this.currentCSSEditor;
        }
        else
        {
            Firebug.Editor.stopEditing();
        }
    },

    toggleEditing: function()
    {
        if (this.editing)
        {
            this.stopEditing();
            Events.dispatch(this.fbListeners, "onStopCSSEditing", [this.context]);
        }
        else
        {
            if (!this.location)
                return;

            var styleSheet = this.location.editStyleSheet
                ? this.location.editStyleSheet.sheet
                : this.location;

            this.currentCSSEditor = CSSModule.getCurrentEditor();
            try
            {
                this.currentCSSEditor.startEditing(styleSheet, this.context, this);
                Events.dispatch(this.fbListeners, "onStartCSSEditing", [styleSheet, this.context]);
            }
            catch(exc)
            {
                var mode = CSSModule.getCurrentEditorName();
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("editor.startEditing ERROR "+exc, {exc: exc, name: mode,
                        currentEditor: this.currentCSSEditor, styleSheet: styleSheet,
                        CSSModule: CSSModule});
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    loadOriginalSource: function()
    {
        if (!this.location)
            return;

        var styleSheet = this.location;

        var css = getOriginalStyleSheetCSS(styleSheet, this.context);

        this.stylesheetEditor.setValue(css);
        this.stylesheetEditor.saveEdit(null, css);
        //styleSheet.editStyleSheet.showUnformated = true;
    },

    getStylesheetURL: function(rule, getBaseUri)
    {
        if (this.location.href)
            return this.location.href;
        else if (getBaseUri)
            return this.context.window.document.baseURI;
        else
            return this.context.window.location.href;
    },

    getRuleByLine: function(styleSheet, line)
    {
        if (!Dom.domUtils)
            return null;

        var cssRules = styleSheet.cssRules;
        for (var i = 0; i < cssRules.length; ++i)
        {
            var rule = cssRules[i];
            var previousRule;
            if (rule instanceof window.CSSStyleRule)
            {
                var selectorLine = Dom.domUtils.getRuleLine(rule);
                // The declarations are on lines equal or greater than the selectorLine
                if (selectorLine === line) // then the line requested is a selector line
                    return rule;
                if (selectorLine > line) // then we passed the rule for the requested line
                    return previousRule;
                // else the requested line is still ahead
                previousRule = rule;
            }
        }
    },

    highlightRule: function(rule)
    {
        var ruleElement = Firebug.getElementByRepObject(this.panelNode.firstChild, rule);
        if (ruleElement)
        {
            Dom.scrollIntoCenterView(ruleElement, this.panelNode);
            Css.setClassTimed(ruleElement, "jumpHighlight", this.context);
        }
    },

    getStyleSheetRules: function(context, styleSheet)
    {
        if (!styleSheet)
            return [];

        var isSystemSheet = Url.isSystemStyleSheet(styleSheet);

        var createRules = function(cssRules)
        {
            var i;
            var props;
            var rules = [];

            if (!cssRules)
                return;

            for (i=0; i<cssRules.length; ++i)
            {
                var rule = cssRules[i];
                if (rule instanceof window.CSSStyleRule)
                {
                    props = this.getRuleProperties(context, rule);
                    rules.push({
                        tag: CSSStyleRuleTag.tag,
                        rule: rule,
                        selector: rule.selectorText.replace(/ :/g, " *:"), // (issue 3683)
                        props: props,
                        isSystemSheet: isSystemSheet,
                        isSelectorEditable: true
                    });
                }
                else if (window.CSSSupportsRule && rule instanceof window.CSSSupportsRule)
                {
                    rules.push({
                        tag: CSSSupportsRuleTag.tag,
                        rule: rule,
                        subRules: createRules(Css.safeGetCSSRules(rule)),
                        isSystemSheet: isSystemSheet
                    });
                }
                else if (rule instanceof window.CSSImportRule)
                {
                    rules.push({tag: CSSImportRuleTag.tag, rule: rule});
                }
                else if (rule instanceof window.CSSCharsetRule)
                {
                    rules.push({tag: CSSCharsetRuleTag.tag, rule: rule});
                }
                else if (rule instanceof window.CSSMediaRule)
                {
                    rules.push({
                        tag: CSSMediaRuleTag.tag,
                        rule: rule,
                        subRules: createRules(Css.safeGetCSSRules(rule)),
                        isSystemSheet: isSystemSheet
                    });
                }
                else if (rule instanceof window.CSSMozDocumentRule)
                {
                    rules.push({
                        tag: CSSDocumentRuleTag.tag,
                        rule: rule,
                        subRules: createRules(Css.safeGetCSSRules(rule)),
                        isSystemSheet: isSystemSheet
                    });
                }
                else if (rule instanceof window.CSSFontFaceRule)
                {
                    props = this.parseCSSProps(rule.style);
                    this.sortProperties(props);
                    rules.push({
                        tag: CSSFontFaceRuleTag.tag,
                        rule: rule,
                        props: props,
                        isSystemSheet: isSystemSheet,
                        isNotEditable: true
                    });
                }
                else if (window.CSSPageRule && rule instanceof window.CSSPageRule)
                {
                    props = this.parseCSSProps(rule.style);
                    this.sortProperties(props);
                    rules.push({
                        tag: CSSPageRuleTag.tag,
                        rule: rule,
                        props: props,
                        isSystemSheet: isSystemSheet,
                        isNotEditable: true
                    });
                }
                else if ((window.CSSKeyframesRule && rule instanceof window.CSSKeyframesRule) ||
                    rule instanceof window.MozCSSKeyframesRule)
                {
                    rules.push({
                        tag: CSSKeyframesRuleTag.tag,
                        rule: rule,
                        subRules: createRules(Css.safeGetCSSRules(rule)),
                        isSystemSheet: isSystemSheet
                    });
                }
                else if ((window.CSSKeyframeRule && rule instanceof window.CSSKeyframeRule) ||
                    rule instanceof window.MozCSSKeyframeRule)
                {
                    props = this.parseCSSProps(rule.style);
                    this.sortProperties(props);
                    rules.push({
                        tag: CSSKeyframeRuleTag.tag,
                        rule: rule,
                        props: props,
                        isSystemSheet: isSystemSheet
                    });
                }
                else if (rule instanceof window.CSSNameSpaceRule)
                {
                    // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=754772
                    // MozCSSKeyframesRules, MozCSSKeyframeRules and CSSPageRules are recognized
                    // as CSSNameSpaceRules, so explicitly check whether the rule is not a
                    // MozCSSKeyframesRule, a MozCSSKeyframeRule or a CSSPageRule

                    var reNamespace = /^@namespace ((.+) )?url\("(.*?)"\);$/;
                    var namespace = rule.cssText.match(reNamespace);
                    var prefix = namespace[2] || "";
                    var name = namespace[3];
                    rules.push({tag: CSSNamespaceRuleTag.tag, rule: rule, prefix: prefix,
                        name: name, isNotEditable: true});
                }
                else
                {
                    if (FBTrace.DBG_ERRORS && FBTrace.DBG_CSS)
                        FBTrace.sysout("css getStyleSheetRules failed to classify a rule ", rule);
                }
            }

            return rules;
        }.bind(this);

        return createRules(Css.safeGetCSSRules(styleSheet));
    },

    parseCSSProps: function(style, inheritMode)
    {
        var m;
        var props = [];

        if (Firebug.expandShorthandProps)
        {
            var count = style.length-1;
            var index = style.length;

            while (index--)
            {
                var propName = style.item(count - index);
                this.addProperty(propName, style.getPropertyValue(propName),
                    !!style.getPropertyPriority(propName), false, inheritMode, props);
            }
        }
        else
        {
            var lines = style.cssText.match(/(?:[^;\(]*(?:\([^\)]*?\))?[^;\(]*)*;?/g);
            var propRE = /\s*([^:\s]*)\s*:\s*(.*?)\s*(! important)?;?$/;
            var line;
            var i=0;
            while(line = lines[i++])
            {
                m = propRE.exec(line);
                if(!m)
                    continue;

                //var name = m[1], value = m[2], important = !!m[3];
                if (m[2])
                    this.addProperty(m[1], m[2], !!m[3], false, inheritMode, props);
            }
        }

        return props;
    },

    sortProperties: function(props)
    {
        props.sort(function(a, b)
        {
            return a.name > b.name ? 1 : -1;
        });
    },

    getRuleProperties: function(context, rule, inheritMode)
    {
        var props = this.parseCSSProps(rule.style, inheritMode);

        this.addDisabledProperties(context, rule, inheritMode, props);
        this.sortProperties(props);

        return props;
    },

    addDisabledProperties: function(context, rule, inheritMode, props)
    {
        var disabledMap = this.getDisabledMap(context);
        var moreProps = disabledMap.get(rule);
        if (moreProps)
        {
            var propMap = {};
            for (var i = 0; i < props.length; ++i)
                propMap[props[i].name] = true;

            for (var i = 0; i < moreProps.length; ++i)
            {
                var prop = moreProps[i];
                if (propMap.hasOwnProperty(prop.name))
                {
                    // A (probably enabled) property with the same name as this
                    // disabled one has appeared - remove this one entirely.
                    moreProps.splice(i, 1);
                    --i;
                    continue;
                }
                propMap[prop.name] = true;
                this.addProperty(prop.name, prop.value, prop.important, true, inheritMode, props);
            }
        }
    },

    addProperty: function(name, value, important, disabled, inheritMode, props)
    {
        if (inheritMode && !Dom.domUtils.isInheritedProperty(name))
            return;

        name = this.translateName(name, value);
        if (name)
        {
            value = Css.stripUnits(formatColor(value));
            important = important ? " !important" : "";

            var prop = {name: name, value: value, important: important, disabled: disabled};
            props.push(prop);
        }
    },

    translateName: function(name, value)
    {
        // Don't show these proprietary Mozilla properties
        if ((value == "-moz-initial"
            && (name == "-moz-background-clip" || name == "-moz-background-origin"
                || name == "-moz-background-inline-policy"))
        || (value == "physical"
            && (name == "margin-left-ltr-source" || name == "margin-left-rtl-source"
                || name == "margin-right-ltr-source" || name == "margin-right-rtl-source"))
        || (value == "physical"
            && (name == "padding-left-ltr-source" || name == "padding-left-rtl-source"
                || name == "padding-right-ltr-source" || name == "padding-right-rtl-source")))
            return null;

        // Translate these back to the form the user probably expects
        if (name == "margin-left-value")
            return "margin-left";
        else if (name == "margin-right-value")
            return "margin-right";
        else if (name == "margin-top-value")
            return "margin-top";
        else if (name == "margin-bottom-value")
            return "margin-bottom";
        else if (name == "padding-left-value")
            return "padding-left";
        else if (name == "padding-right-value")
            return "padding-right";
        else if (name == "padding-top-value")
            return "padding-top";
        else if (name == "padding-bottom-value")
            return "padding-bottom";
        // XXXjoe What about border!
        else
            return name;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    getDisabledMap: function(context)
    {
        // Ideally, we'd use a WeakMap here, but WeakMaps don't allow CSS rules
        // as keys before Firefox 17. A Map is used instead. (cf. bug 777373.)
        if (!context.cssDisabledMap)
            context.cssDisabledMap = new Map();
        return context.cssDisabledMap;
    },

    remapRule: function(context, oldRule, newRule)
    {
        var map = this.getDisabledMap(context);
        if (map.has(oldRule))
            map.set(newRule, map.get(oldRule));
    },

    editElementStyle: function()
    {
        var rulesBox = this.panelNode.getElementsByClassName("cssElementRuleContainer")[0];
        var styleRuleBox = rulesBox && Firebug.getElementByRepObject(rulesBox, this.selection);
        if (!styleRuleBox)
        {
            var rule = {
                rule: this.selection,
                inherited: false,
                selector: "element.style",
                props: []
            };

            if (!rulesBox)
            {
                // The element did not have any displayed styles. We need to create the
                // whole tree and remove the no styles message
                styleRuleBox = this.template.cascadedTag.replace({
                    rules: [rule], inherited: [], inheritLabel: Locale.$STR("InheritedFrom")
                }, this.panelNode);

                styleRuleBox = styleRuleBox.getElementsByClassName("cssElementRuleContainer")[0];
            }
            else
            {
                styleRuleBox = this.template.ruleTag.insertBefore({rule: rule}, rulesBox);
            }

            styleRuleBox = styleRuleBox.getElementsByClassName("insertInto")[0];
        }

        Firebug.Editor.insertRowForObject(styleRuleBox);
    },

    addRelatedRule: function()
    {
        if (!this.panelNode.getElementsByClassName("cssElementRuleContainer")[0])
        {
            // The element did not have any displayed styles - create the whole
            // tree and remove the no styles message.
            this.template.cascadedTag.replace({
                rules: [], inherited: [],
                inheritLabel: Locale.$STR("InheritedFrom")
            }, this.panelNode);
        }

        // Insert the new rule at the top, or after the style rules if there
        // are any.
        var container = this.panelNode.getElementsByClassName("cssNonInherited")[0];
        var ruleBox = container.getElementsByClassName("cssElementRuleContainer")[0];
        var styleRuleBox = ruleBox && Firebug.getElementByRepObject(ruleBox, this.selection);
        if (styleRuleBox)
            ruleBox = this.template.newRuleTag.insertAfter({}, ruleBox);
        else if (ruleBox)
            ruleBox = this.template.newRuleTag.insertBefore({}, ruleBox);
        else
            ruleBox = this.template.newRuleTag.append({}, container);

        var before = ruleBox.getElementsByClassName("insertBefore")[0];
        Firebug.Editor.insertRow(before, "before");

        // Auto-fill the selector field with something reasonable, like
        // ".some-class" or "#table td".
        var el = this.selection, doc = el.ownerDocument;
        var base = Xml.getNodeName(el), autofill;
        if (el.className)
        {
            autofill = "." + Arr.cloneArray(el.classList).join(".");
        }
        else
        {
            var level = 0;
            el = el.parentNode;
            while (!autofill && el !== doc)
            {
                ++level;
                if (el.id !== "")
                    autofill = "#" + el.id;
                else if (el.className !== "")
                    autofill = "." + Arr.cloneArray(el.classList).join(".");
                el = el.parentNode;
            }
            if (autofill)
            {
                if (level === 1)
                    autofill += " >";
                autofill += " " + base;
            }
        }

        if (!autofill ||
            doc.querySelectorAll(autofill).length === doc.querySelectorAll(base).length)
        {
            autofill = base;
        }

        this.ruleEditor.setValue(autofill);
        this.ruleEditor.input.select();
        Firebug.Editor.update(true);
    },

    editMediaQuery: function(target)
    {
        var row = Dom.getAncestorByClass(target, "cssRule");
        var mediaQueryBox = Dom.getChildByClass(row, "cssMediaQuery");
        Firebug.Editor.startEditing(mediaQueryBox);
    },

    insertPropertyRow: function(row)
    {
        Firebug.Editor.insertRowForObject(row);
    },

    insertRule: function(row)
    {
        var location = Dom.getAncestorByClass(row, "cssRule");
        if (!location)
        {
            location = Dom.getChildByClass(this.panelNode, "cssSheet");

            // Stylesheet has no rules
            if (!location)
                this.template.tag.replace({rules: []}, this.panelNode);

            location = Dom.getChildByClass(this.panelNode, "cssSheet");
            Firebug.Editor.insertRowForObject(location);
        }
        else
        {
            Firebug.Editor.insertRow(location, "before");
        }
    },

    editPropertyRow: function(row)
    {
        var propValueBox = Dom.getChildByClass(row, "cssPropValue");
        Firebug.Editor.startEditing(propValueBox);
    },

    deletePropertyRow: function(row)
    {
        var rule = Firebug.getRepObject(row);
        var propName = Dom.getChildByClass(row, "cssPropName").textContent;

        // Try removing the property from the "disabled" map.
        var wasDisabled = this.removeDisabledProperty(rule, propName);

        // If that fails, remove the actual property instead.
        if (!wasDisabled)
            CSSModule.deleteProperty(rule, propName, this.context);

        if (this.name == "stylesheet")
            Events.dispatch(this.fbListeners, "onInlineEditorClose", [this, row.firstChild, true]);

        row.parentNode.removeChild(row);

        this.markChange(this.name == "stylesheet");
    },

    removeDisabledProperty: function(rule, propName)
    {
        var disabledMap = this.getDisabledMap(this.context);
        var map = disabledMap.get(rule);
        if (!map)
            return false;
        for (var i = 0; i < map.length; ++i)
        {
            if (map[i].name === propName)
            {
                map.splice(i, 1);
                return true;
            }
        }
        return false;
    },

    disablePropertyRow: function(row)
    {
        Css.toggleClass(row, "disabledStyle");

        var rule = Firebug.getRepObject(row);
        var propName = Dom.getChildByClass(row, "cssPropName").textContent;

        var disabledMap = this.getDisabledMap(this.context);
        if (!disabledMap.has(rule))
            disabledMap.set(rule, []);
        var map = disabledMap.get(rule);

        var propValue = Dom.getChildByClass(row, "cssPropValue").textContent;
        var parsedValue = parsePriority(propValue);

        CSSModule.disableProperty(Css.hasClass(row, "disabledStyle"), rule,
            propName, parsedValue, map, this.context);

        this.markChange(this.name == "stylesheet");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    // When handling disable button clicks, we cannot simply use a 'click'
    // event, because refresh() may be (and often is) called in between
    // mousedown and mouseup, replacing the DOM structure. Instead, a
    // description of the moused-down disable button's property is saved
    // and explicitly checked on mouseup (issue 5500).
    clickedPropTag: null,

    getPropTag: function(event)
    {
        var row = Dom.getAncestorByClass(event.target, "cssProp");
        var rule = Firebug.getRepObject(row);
        var propName = Dom.getChildByClass(row, "cssPropName").textContent;
        return {
            a: rule, b: propName,
            equals: function(other)
            {
                return (other && this.a === other.a && this.b === other.b);
            }
        };
    },

    clickedDisableButton: function(event)
    {
        if (!Css.hasClass(event.target, "cssPropIndent"))
            return false;

        // XXX hack
        var clientOffset = Dom.getClientOffset(event.target);
        if (event.clientX - clientOffset.x > 20)
            return false;
        if (Css.hasClass(event.target, "textEditor inlineExpander"))
            return false;
        var row = Dom.getAncestorByClass(event.target, "cssProp");
        return (row && Css.hasClass(row, "editGroup"));
    },

    onMouseDown: function(event)
    {
        this.clickedPropTag = null;
        if (Events.isLeftClick(event) && this.clickedDisableButton(event))
        {
            this.clickedPropTag = this.getPropTag(event);

            // Don't select text when double-clicking the disable button.
            Events.cancelEvent(event);
        }
    },

    onMouseUp: function(event)
    {
        if (Events.isLeftClick(event) && this.clickedDisableButton(event) &&
            this.getPropTag(event).equals(this.clickedPropTag))
        {
            var row = Dom.getAncestorByClass(event.target, "cssProp");
            this.disablePropertyRow(row);
            Events.cancelEvent(event);
        }
        this.clickedPropTag = null;
    },

    onClick: function(event)
    {
        if (!Events.isLeftClick(event))
            return;

        if (Events.isDoubleClick(event) && !this.clickedDisableButton(event))
        {
            var row = Dom.getAncestorByClass(event.target, "cssRule");
            if (row && !Dom.getAncestorByClass(event.target, "cssPropName")
                && !Dom.getAncestorByClass(event.target, "cssPropValue"))
            {
                this.insertPropertyRow(row);
                Events.cancelEvent(event);
            }
        }
    },

    supportsObject: function(object, type)
    {
        if (object instanceof window.CSSStyleSheet)
        {
            return 1;
        }
        else if (object instanceof window.CSSRule ||
            (object instanceof window.CSSStyleDeclaration && object.parentRule) ||
            (object instanceof SourceLink.SourceLink && object.type == "css" &&
                Url.reCSS.test(object.href)))
        {
            return 2;
        }
        else
        {
            return 0;
        }
    },

    updateLocation: function(styleSheet)
    {
        if (FBTrace.DBG_CSS)
        {
            FBTrace.sysout("css.updateLocation; " + (styleSheet ? styleSheet.href :
                "no stylesheet"));
        }

        this.doUpdateLocation(styleSheet);
    },

    doUpdateLocation: function(styleSheet)
    {
        if (FBTrace.DBG_CSS)
        {
            FBTrace.sysout("css.doUpdateLocation; " + (styleSheet ? styleSheet.href :
                "no stylesheet"));
        }

        var rules = [];
        if (styleSheet)
        {
            if (!Css.shouldIgnoreSheet(styleSheet))
            {
                if (styleSheet.editStyleSheet)
                    styleSheet = styleSheet.editStyleSheet.sheet;

                rules = this.getStyleSheetRules(this.context, styleSheet);
            }
        }

        if (rules && rules.length)
        {
            this.template.tag.replace({rules: rules}, this.panelNode);
        }
        else
        {
            // If there are no rules on the page display a description that also
            // contains a link "create a rule".
            var warning = FirebugReps.Warning.tag.replace({object: ""}, this.panelNode);
            FirebugReps.Description.render(Locale.$STR("css.EmptyStyleSheet"),
                warning, Obj.bind(this.insertRule, this));
        }

        // Show CSS buttons only if there is a stylesheet and it isn't a system stylesheet.
        // Displaying panel's buttons must happens only if the panel is actually visible
        // otherwise the button could appear on another panel's toolbar.
        var showButtons = this.location && !Url.isSystemStyleSheet(this.location);
        this.showToolbarButtons("fbCSSButtons", showButtons);

        Events.dispatch(this.fbListeners, "onCSSRulesAdded", [this, this.panelNode]);

        // If the full editing mode (not the inline) is on while the location changes,
        // open the editor again for another file.
        if (this.editing && this.stylesheetEditor && this.stylesheetEditor.editing)
        {
            // Remove the editing flag to avoid recursion. The StylesheetEditor.endEditing
            // calls refresh and consequently updateLocation of the CSS panel.
            this.editing = null;

            // Stop the current editing.
            this.stopEditing();

            // ... and open the editor again.
            this.toggleEditing();
        }
    },

    updateSelection: function(object)
    {
        this.selection = null;

        if (object instanceof window.CSSStyleDeclaration)
        {
            object = object.parentRule;
        }

        if (object instanceof window.CSSRule)
        {
            this.navigate(object.parentStyleSheet);
            this.highlightRule(object);
        }
        else if (object instanceof window.CSSStyleSheet)
        {
            this.navigate(object);
        }
        else if (object instanceof SourceLink.SourceLink)
        {
            try
            {
                var sourceLink = object;

                var sourceFile = Firebug.SourceFile.getSourceFileByHref(
                    sourceLink.href, this.context);

                if (sourceFile)
                {
                    Dom.clearNode(this.panelNode);  // replace rendered stylesheets

                    // xxxHonza: huh, this method doesn't even exist?
                    this.showSourceFile(sourceFile);

                    var lineNo = object.line;
                    if (lineNo)
                        this.scrollToLine(lineNo, this.jumpHighlightFactory(lineNo, this.context));
                }
                else // XXXjjb we should not be taking this path
                {
                    var stylesheet = Css.getStyleSheetByHref(sourceLink.href, this.context);
                    if (stylesheet)
                    {
                        this.navigate(stylesheet);
                    }
                    else
                    {
                        if (FBTrace.DBG_CSS)
                            FBTrace.sysout("css.updateSelection no sourceFile for " +
                                sourceLink.href, sourceLink);
                    }
                }
            }
            catch(exc)
            {
                if (FBTrace.DBG_CSS)
                    FBTrace.sysout("css.upDateSelection FAILS "+exc, exc);
            }
        }
    },

    updateOption: function(name, value)
    {
        if (name == "expandShorthandProps" || name == "colorDisplay")
            this.refresh();
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    getLocationList: function()
    {
        var styleSheets = Css.getAllStyleSheets(this.context);
        return styleSheets;
    },

    getOptionsMenuItems: function()
    {
        items = [
             Menu.optionMenu("Expand_Shorthand_Properties", "expandShorthandProps",
             "css.option.tip.Expand_Shorthand_Properties")
        ];

        items = Arr.extendArray(items, CSSModule.getColorDisplayOptionMenuItems());

        items.push(
            "-",
            {
                label: "Refresh",
                tooltiptext: "panel.tip.Refresh",
                command: Obj.bind(this.refresh, this)
            }
        );

        return items;
    },

    getContextMenuItems: function(style, target)
    {
        var items = [];

        if (target.nodeName == "TEXTAREA")
        {
            items = Firebug.BaseEditor.getContextMenuItems();
            items.push(
                "-",
                {
                    id: "fbLoadOriginalSource",
                    label: "Load_Original_Source",
                    tooltiptext: "css.tip.Load_Original_Source",
                    command: Obj.bindFixed(this.loadOriginalSource, this)
                }
            );
            return items;
        }

        if (Css.hasClass(target, "cssSelector"))
        {
            items.push(
                {
                    id: "fbCopyRuleDeclaration",
                    label: "Copy_Rule_Declaration",
                    tooltiptext: "css.tip.Copy_Rule_Declaration",
                    command: Obj.bindFixed(this.copyRuleDeclaration, this, target)
                },
                {
                    id: "fbCopyStyleDeclaration",
                    label: "Copy_Style_Declaration",
                    tooltiptext: "css.tip.Copy_Style_Declaration",
                    command: Obj.bindFixed(this.copyStyleDeclaration, this, target)
                }
            );
        }

        var prop = Dom.getAncestorByClass(target, "cssProp");
        if (prop)
        {
            items.push(
                {
                    id: "fbCopyPropertyDeclaration",
                    label: "css.label.Copy_Property_Declaration",
                    tooltiptext: "css.tip.Copy_Property_Declaration",
                    command: Obj.bindFixed(this.copyPropertyDeclaration, this, prop)
                },
                {
                    id: "fbCopyPropertyName",
                    label: "css.label.Copy_Property_Name",
                    tooltiptext: "css.tip.Copy_Property_Name",
                    command: Obj.bindFixed(this.copyPropertyName, this, prop)
                },
                {
                    id: "fbCopyPropertyValue",
                    label: "css.label.Copy_Property_Value",
                    tooltiptext: "css.tip.Copy_Property_Value",
                    command: Obj.bindFixed(this.copyPropertyValue, this, prop)
                }
            );
        }

        var propValue = Dom.getAncestorByClass(target, "cssPropValue");
        if (propValue)
        {
            if (this.infoTipType == "color")
            {
                items.push(
                    {
                        id: "fbCopyColor",
                        label: "CopyColor",
                        tooltiptext: "css.tip.Copy_Color",
                        command: Obj.bindFixed(System.copyToClipboard, System, this.infoTipObject)
                    }
                );
            }
            else if (this.infoTipType == "image")
            {
                items.push(
                    {
                        id: "fbCopyImageLocation",
                        label: "CopyImageLocation",
                        tooltiptext: "css.tip.Copy_Image_Location",
                        command: Obj.bindFixed(System.copyToClipboard, System, this.infoTipObject)
                    },
                    {
                        id: "fbOpenImageInNewTab",
                        label: "OpenImageInNewTab",
                        tooltiptext: "css.tip.Open_Image_In_New_Tab",
                        command: Obj.bindFixed(Win.openNewTab, Win, this.infoTipObject)
                    }
                );
            }
        }

        if (!Url.isSystemStyleSheet(this.selection))
        {
            items.push(
                "-",
                {
                    id: "fbNewCSSRule",
                    label: "NewRule",
                    tooltiptext: "css.tip.New_Rule",
                    command: Obj.bindFixed(this.insertRule, this, target)
                }
            );
        }

        if (Css.hasClass(target, "cssSelector"))
        {
            var selector = Str.cropString(target.textContent, 30);
            items.push(
                {
                    id: "fbDeleteRuleDeclaration",
                    label: Locale.$STRF("css.Delete_Rule", [selector]),
                    tooltiptext: Locale.$STRF("css.tip.Delete_Rule", [selector]),
                    nol10n: true,
                    command: Obj.bindFixed(this.deleteRuleDeclaration, this, target)
                }
            );
        }

        var cssRule = Dom.getAncestorByClass(target, "cssRule");
        if (cssRule)
        {
            if(Css.hasClass(cssRule, "cssEditableRule"))
            {
                items.push(
                    "-",
                    {
                        id: "fbNewCSSProp",
                        label: "NewProp",
                        tooltiptext: "css.tip.New_Prop",
                        command: Obj.bindFixed(this.insertPropertyRow, this, target)
                    }
                );

                var propRow = Dom.getAncestorByClass(target, "cssProp");
                if (propRow)
                {
                    var propName = Dom.getChildByClass(propRow, "cssPropName").textContent;
                    var isDisabled = Css.hasClass(propRow, "disabledStyle");

                    items.push(
                        {
                            id: "fbEditCSSProp",
                            label: Locale.$STRF("EditProp", [propName]),
                            tooltiptext: Locale.$STRF("css.tip.Edit_Prop", [propName]),
                            nol10n: true,
                            command: Obj.bindFixed(this.editPropertyRow, this, propRow)
                        },
                        {
                            id: "fbDeleteCSSProp",
                            label: Locale.$STRF("DeleteProp", [propName]),
                            tooltiptext: Locale.$STRF("css.tip.Delete_Prop", [propName]),
                            nol10n: true,
                            command: Obj.bindFixed(this.deletePropertyRow, this, propRow)
                        },
                        {
                            id: "fbDisableCSSProp",
                            label: Locale.$STRF("DisableProp", [propName]),
                            tooltiptext: Locale.$STRF("css.tip.Disable_Prop", [propName]),
                            nol10n: true,
                            type: "checkbox",
                            checked: isDisabled,
                            command: Obj.bindFixed(this.disablePropertyRow, this, propRow)
                        }
                    );
                }
            }

            if (Css.hasClass(cssRule, "importRule"))
            {
                items.push(
                    {
                        id: "fbEditMediaQuery",
                        label: "css.menu.Edit_Media_Query",
                        tooltiptext: "css.menu.tip.Edit_Media_Query",
                        command: Obj.bindFixed(this.editMediaQuery, this, target)
                    }
                );
            }
        }

        items.push(
            "-",
            {
                id: "fbRefresh",
                label: "Refresh",
                command: Obj.bind(this.refresh, this),
                tooltiptext: "panel.tip.Refresh"
            }
        );

        return items;
    },

    browseObject: function(object)
    {
        if (this.infoTipType == "image")
        {
            Win.openNewTab(this.infoTipObject);
            return true;
        }
    },

    showInfoTip: function(infoTip, target, x, y, rangeParent, rangeOffset)
    {
        var propValue = Dom.getAncestorByClass(target, "cssPropValue");
        if (propValue)
        {
            var prop = Dom.getAncestorByClass(target, "cssProp");
            var styleRule = Firebug.getRepObject(prop);
            var propNameNode = prop.getElementsByClassName("cssPropName").item(0);
            var propName = propNameNode.textContent.toLowerCase();
            var priority = styleRule.style.getPropertyPriority(propName);
            var text = styleRule.style.getPropertyValue(propName) +
                (priority ? " !" + priority : "");

            if (text != "")
            {
                text = formatColor(text);
            }
            else
            {
                var disabledMap = this.getDisabledMap(this.context);
                var disabledProps = disabledMap.get(styleRule);
                if (disabledProps)
                {
                    for (var i = 0, len = disabledProps.length; i < len; ++i)
                    {
                        if (disabledProps[i].name == propName)
                        {
                            priority = disabledProps[i].important;
                            text = disabledProps[i].value + (priority ? " !" + priority : "");
                            break;
                        }
                    }
                }
            }

            var cssValue;
            if (propName == "font" || propName == "font-family")
            {
                if (text.charAt(rangeOffset) == ",")
                    return;

                cssValue = CSSModule.parseCSSFontFamilyValue(text, rangeOffset, propName);
            }
            else
            {
                cssValue = CSSModule.parseCSSValue(text, rangeOffset);
            }

            if (!cssValue)
                return false;

            if (cssValue.value === "currentcolor")
            {
                cssValue.value = this.getCurrentColor();
                if (cssValue.value === "")
                    return false;
            }

            if (cssValue.value == this.infoTipValue)
                return true;

            this.infoTipValue = cssValue.value;

            switch (cssValue.type)
            {
                case "rgb":
                case "hsl":
                case "gradient":
                case "colorKeyword":
                    this.infoTipType = "color";
                    this.infoTipObject = cssValue.value;
                    return CSSInfoTip.populateColorInfoTip(infoTip, cssValue.value);

                case "url":
                    if (Css.isImageRule(Xml.getElementSimpleType(Firebug.getRepObject(target)),
                        propNameNode.textContent))
                    {
                        var prop = Dom.getAncestorByClass(target, "cssProp");
                        var rule = Firebug.getRepObject(prop);
                        var baseURL = this.getStylesheetURL(rule, true);
                        var relURL = CSSModule.parseURLValue(cssValue.value);
                        var absURL = Url.isDataURL(relURL) ? relURL : Url.absoluteURL(relURL, baseURL);
                        var repeat = CSSModule.parseRepeatValue(text);

                        this.infoTipType = "image";
                        this.infoTipObject = absURL;

                        return CSSInfoTip.populateImageInfoTip(infoTip, absURL, repeat);
                    }
                    break;

                case "fontFamily":
                    return CSSInfoTip.populateFontFamilyInfoTip(infoTip, cssValue.value);
            }

            delete this.infoTipType;
            delete this.infoTipValue;
            delete this.infoTipObject;

            return false;
        }
    },

    getCurrentColor: function()
    {
        return "";
    },

    getEditor: function(target, value)
    {
        if (target == this.panelNode
            || Css.hasClass(target, "cssSelector") || Css.hasClass(target, "cssRule")
            || Css.hasClass(target, "cssSheet"))
        {
            if (!this.ruleEditor)
                this.ruleEditor = new CSSRuleEditor(this.document);

            return this.ruleEditor;
        }
        else
        {
            if (!this.editor)
                this.editor = new CSSEditor(this.document);

            return this.editor;
        }
    },

    getDefaultLocation: function()
    {
        // Note: We can't do makeDefaultStyleSheet here, because that could be
        // damaging for special pages (see e.g. issues 2440, 3688).
        try
        {
            var styleSheets = this.getLocationList();
            if (styleSheets.length)
            {
                var sheet = styleSheets[0];
                return (Firebug.filterSystemURLs &&
                    Url.isSystemURL(Css.getURLForStyleSheet(sheet))) ? null : sheet;
            }
        }
        catch (exc)
        {
            if (FBTrace.DBG_LOCATIONS)
                FBTrace.sysout("css.getDefaultLocation FAILS "+exc, exc);
        }
    },

    getObjectLocation: function(styleSheet)
    {
        return Css.getURLForStyleSheet(styleSheet);
    },

    getObjectDescription: function(styleSheet)
    {
        var url = Css.getURLForStyleSheet(styleSheet);
        var instance = Css.getInstanceForStyleSheet(styleSheet);

        var baseDescription = Url.splitURLBase(url);
        if (instance) {
          baseDescription.name = baseDescription.name + " #" + (instance + 1);
        }
        return baseDescription;
    },

    getSourceLink: function(target, rule)
    {
        var element = rule.parentStyleSheet.ownerNode;
        var href = rule.parentStyleSheet.href;  // Null means inline

        // http://code.google.com/p/fbug/issues/detail?id=452
        if (!href)
            href = element.ownerDocument.location.href;

        var line = getRuleLine(rule);
        var instance = Css.getInstanceForStyleSheet(rule.parentStyleSheet);
        var sourceLink = new SourceLink.SourceLink(href, line, "css", rule, instance);

        return sourceLink;
    },

    getTopmostRuleLine: function()
    {
        var panelNode = this.panelNode;
        for (var child = panelNode.firstChild; child; child = child.nextSibling)
        {
            if (child.offsetTop+child.offsetHeight > panelNode.scrollTop)
            {
                var rule = child.repObject;
                if (rule)
                {
                    return {
                        line: getRuleLine(rule),
                        offset: panelNode.scrollTop-child.offsetTop
                    };
                }
            }
        }
        return 0;
    },

    getCurrentLineNumber: function()
    {
        var ruleLine = this.getTopMostRuleLine();
        if (ruleLine)
            return ruleLine.line;
    },

    search: function(text, reverse)
    {
        var curDoc = this.searchCurrentDoc(!Firebug.searchGlobal, text, reverse);
        if (!curDoc && Firebug.searchGlobal)
        {
            return this.searchOtherDocs(text, reverse) ||
                this.searchCurrentDoc(true, text, reverse);
        }
        return curDoc;
    },

    searchOtherDocs: function(text, reverse)
    {
        var scanRE = Firebug.Search.getTestingRegex(text);
        function scanDoc(styleSheet) {
            // we don't care about reverse here as we are just looking for existence,
            // if we do have a result we will handle the reverse logic on display
            for (var i = 0; i < styleSheet.cssRules.length; i++)
            {
                if (scanRE.test(styleSheet.cssRules[i].cssText))
                {
                    return true;
                }
            }
        }

        if (this.navigateToNextDocument(scanDoc, reverse))
        {
            // firefox findService can't find nodes immediatly after insertion
            // xxxHonza: the timeout has been increased to 100 since search across
            // multiple documents didn't work sometimes.
            // Of course, it would be great to get rid of the timeout.
            setTimeout(Obj.bind(this.searchCurrentDoc, this), 100, true, text, reverse);
            return "wraparound";
        }
    },

    searchCurrentDoc: function(wrapSearch, text, reverse)
    {
        var row, sel;

        if (!text)
        {
            delete this.currentSearch;
            this.highlightNode(null);
            this.document.defaultView.getSelection().removeAllRanges();
            return false;
        }

        if (this.currentSearch && text == this.currentSearch.text)
        {
            row = this.currentSearch.findNext(wrapSearch, false, reverse,
                Firebug.Search.isCaseSensitive(text));
        }
        else
        {
            if (this.editing)
            {
                this.currentSearch = new Search.TextSearch(this.stylesheetEditor.box);
                row = this.currentSearch.find(text, reverse, Firebug.Search.isCaseSensitive(text));

                if (row)
                {
                    sel = this.document.defaultView.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(this.currentSearch.range);

                    scrollSelectionIntoView(this);
                    this.highlightNode(row);

                    return true;
                }
                else
                {
                    return false;
                }
            }
            else
            {
                function findRow(node) {
                    return node.nodeType == Node.ELEMENT_NODE ? node : node.parentNode;
                }

                this.currentSearch = new Search.TextSearch(this.panelNode, findRow);
                row = this.currentSearch.find(text, reverse, Firebug.Search.isCaseSensitive(text));
            }
        }

        if (row)
        {
            sel = this.document.defaultView.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.currentSearch.range);

            // Should be replaced by scrollToLine() of sourceBox,
            // though first jumpHighlightFactory() has to be adjusted to
            // remove the current highlighting when called again
            Dom.scrollIntoCenterView(row, this.panelNode);
            this.highlightNode(row.parentNode);

            Events.dispatch(this.fbListeners, "onCSSSearchMatchFound", [this, text, row]);
            return this.currentSearch.wrapped ? "wraparound" : true;
        }
        else
        {
            this.document.defaultView.getSelection().removeAllRanges();
            Events.dispatch(this.fbListeners, "onCSSSearchMatchFound", [this, text, null]);
            return false;
        }
    },

    getSearchOptionsMenuItems: function()
    {
        return [
            Firebug.Search.searchOptionMenu("search.Case_Sensitive", "searchCaseSensitive",
                "search.tip.Case_Sensitive"),
            Firebug.Search.searchOptionMenu("search.Multiple_Files", "searchGlobal",
                "search.tip.Multiple_Files"),
            Firebug.Search.searchOptionMenu("search.Use_Regular_Expression",
                "searchUseRegularExpression", "search.tip.Use_Regular_Expression")
        ];
    },

    getStyleDeclaration: function(cssSelector)
    {
        var cssRule = Dom.getAncestorByClass(cssSelector, "cssRule");
        var propRows = cssRule.getElementsByClassName("cssProp");

        var lines = [];
        for (var i = 0; i < propRows.length; ++i)
        {
            var row = propRows[i];
            if (row.classList.contains("disabledStyle"))
                continue;

            var name = Dom.getChildByClass(row, "cssPropName").textContent;
            var value = Dom.getChildByClass(row, "cssPropValue").textContent;
            lines.push(name + ": " + value + ";");
        }

        return lines;
    },

    copyRuleDeclaration: function(cssSelector)
    {
        var props = this.getStyleDeclaration(cssSelector);
        System.copyToClipboard(cssSelector.textContent + " {" + Str.lineBreak() + "  " +
            props.join(Str.lineBreak() + "  ") + Str.lineBreak() + "}");
    },

    deleteRuleDeclaration: function(cssSelector)
    {
        var searchRule = Firebug.getRepObject(cssSelector) ||
            Firebug.getRepObject(cssSelector.nextSibling);
        var styleSheet = searchRule.parentRule || searchRule.parentStyleSheet;
        var ruleIndex = 0;
        var cssRules = styleSheet.cssRules;
        while (ruleIndex < cssRules.length && searchRule != cssRules[ruleIndex])
            ruleIndex++;

        if (FBTrace.DBG_CSS)
        {
            FBTrace.sysout("css.deleteRuleDeclaration; selector: "+
                Str.cropString(cssSelector.textContent, 100),
                {styleSheet: styleSheet, ruleIndex: ruleIndex});
        }

        CSSModule.deleteRule(styleSheet, ruleIndex);

        var rule = Dom.getAncestorByClass(cssSelector, "cssRule");
        if (rule)
            rule.parentNode.removeChild(rule);
    },

    copyStyleDeclaration: function(cssSelector)
    {
        var props = this.getStyleDeclaration(cssSelector);
        System.copyToClipboard(props.join(Str.lineBreak()));
    },

    copyPropertyDeclaration: function(prop)
    {
        // xxxsz: repObject should be used instead
        System.copyToClipboard(Str.trim(prop.textContent));
    },

    copyPropertyName: function(prop)
    {
        // xxxsz: repObject should be used instead
        var propName = prop.getElementsByClassName("cssPropName")[0];
        System.copyToClipboard(propName.textContent);
    },

    copyPropertyValue: function(prop)
    {
        // xxxsz: repObject should be used instead
        var propValue = prop.getElementsByClassName("cssPropValue")[0];
        System.copyToClipboard(propValue.textContent);
    }
});

// ********************************************************************************************* //
// CSSEditor

function CSSEditor(doc)
{
    this.initializeInline(doc);
}

CSSEditor.prototype = domplate(Firebug.InlineEditor.prototype,
{
    insertNewRow: function(target, insertWhere)
    {
        var rule = Firebug.getRepObject(target);
        if (!rule)
        {
            if (FBTrace.DBG_CSS)
                FBTrace.sysout("CSSEditor.insertNewRow; ERROR There is no CSS rule", target);
            return;
        }

        var emptyProp = {name: "", value: "", important: ""};

        if (insertWhere == "before")
            return CSSPropTag.tag.insertBefore({prop: emptyProp, rule: rule}, target);
        else
            return CSSPropTag.tag.insertAfter({prop: emptyProp, rule: rule}, target);
    },

    saveEdit: function(target, value, previousValue)
    {
        if (FBTrace.DBG_CSS)
            FBTrace.sysout("CSSEditor.saveEdit", arguments);

        var cssRule = Dom.getAncestorByClass(target, "cssRule");
        var rule = Firebug.getRepObject(cssRule);

        if (rule instanceof window.CSSStyleRule ||
                ((window.CSSKeyframeRule && rule instanceof window.CSSKeyframeRule) ||
                    rule instanceof window.MozCSSKeyframeRule) &&
                !Css.hasClass(target, "cssKeyText") ||
            rule instanceof window.Element)
        {
            var prop = Dom.getAncestorByClass(target, "cssProp");

            if (prop)
            {
                var propName = Dom.getChildByClass(prop, "cssPropName").textContent;
                // If the property was previously disabled, remove it from the "disabled"
                // map. (We will then proceed to enable the property.)
                if (prop && prop.classList.contains("disabledStyle"))
                {
                    prop.classList.remove("disabledStyle");

                    this.panel.removeDisabledProperty(rule, propName);
                }

                if (Css.hasClass(target, "cssPropName"))
                {
                    // Actual saving is done in endEditing, see the comment there.
                    target.textContent = value;
                }
                else if (Dom.getAncestorByClass(target, "cssPropValue"))
                {
                    target.textContent = CSSDomplateBase.getPropertyValue({value: value});

                    propName = Dom.getChildByClass(prop, "cssPropName").textContent;

                    if (FBTrace.DBG_CSS)
                    {
                        FBTrace.sysout("CSSEditor.saveEdit \"" + propName + "\" = \"" +
                            value + "\"");
                       // FBTrace.sysout("CSSEditor.saveEdit BEFORE style:",style);
                    }

                    if (value && value != "null")
                    {
                        var parsedValue = parsePriority(value);
                        CSSModule.setProperty(rule, propName, parsedValue.value,
                            parsedValue.priority);
                    }
                    else if (previousValue && previousValue != "null")
                    {
                        CSSModule.removeProperty(rule, propName);
                    }
                }

                if (value)
                {
                    var saveSuccess = false;
                    if (Css.hasClass(target, "cssPropName"))
                    {
                        var propName = value.replace(/-./g, function(match)
                        {
                            return match[1].toUpperCase();
                        });

                        if (propName in rule.style || propName == "float")
                            saveSuccess = "almost";
                    }
                    else
                    {
                        saveSuccess = !!rule.style.getPropertyValue(propName);
                    }

                    this.box.setAttribute("saveSuccess", saveSuccess);
                }
                else
                {
                    this.box.removeAttribute("saveSuccess");
                }
            }
        }
        else if (window.CSSSupportsRule && rule instanceof window.CSSSupportsRule &&
            Css.hasClass(target, "cssSupportsRuleCondition"))
        {
            target.textContent = value;

            if (FBTrace.DBG_CSS)
            {
                FBTrace.sysout("CSSEditor.saveEdit: @supports rule condition: " +
                    previousValue + "->" + value);
            }

            try
            {
                rule.conditionText = value;
            }
            catch (e)
            {
            }

            var saveSuccess = (rule.conditionText == value);
            this.box.setAttribute("saveSuccess", saveSuccess);
        }
        else if (((window.CSSKeyframeRule && rule instanceof window.CSSKeyframeRule) ||
            rule instanceof window.MozCSSKeyframeRule) &&
            Css.hasClass(target, "cssKeyText"))
        {
            target.textContent = value;

            if (FBTrace.DBG_CSS)
            {
                FBTrace.sysout("CSSEditor.saveEdit: @-moz-keyframe rule key: " +
                    previousValue + "->" + value);
            }

            rule.keyText = value;

            var saveSuccess = (rule.keyText == value || rule.keyText == Css.keyframeKeys[value]);
            this.box.setAttribute("saveSuccess", saveSuccess);
        }
        else if (rule instanceof window.CSSMozDocumentRule &&
                Css.hasClass(target, "cssDocumentRuleCondition"))
        {
            target.textContent = value;

            if (FBTrace.DBG_CSS)
            {
                FBTrace.sysout("CSSEditor.saveEdit: @-moz-document rule condition: " +
                        previousValue + "->" + value);
            }

            try
            {
                rule.conditionText = value;
            }
            catch (e)
            {
            }

            var saveSuccess = (rule.conditionText == value);
            this.box.setAttribute("saveSuccess", saveSuccess);
        }
        else if (rule instanceof window.CSSImportRule && Css.hasClass(target, "cssMediaQuery"))
        {
            target.textContent = value;

            if (FBTrace.DBG_CSS)
            {
                FBTrace.sysout("CSSEditor.saveEdit: @import media query: " +
                    previousValue + "->" + value);
            }

            rule.media.mediaText = value;

            // Workaround to apply the media query changes
            rule.parentStyleSheet.disabled = true;
            rule.parentStyleSheet.disabled = false;

            var row = Dom.getAncestorByClass(target, "importRule");
            row.getElementsByClassName("separator").item(0).textContent =
                value == "" ? "" : String.fromCharCode(160);

            var saveSuccess = rule.media.mediaText != "not all" || value == "not all";
            this.box.setAttribute("saveSuccess", saveSuccess);
        }
        else if (rule instanceof window.CSSMediaRule &&
            Css.hasClass(target, "cssMediaRuleCondition"))
        {
            target.textContent = value;

            if (FBTrace.DBG_CSS)
            {
                FBTrace.sysout("CSSEditor.saveEdit: @media rule condition: " +
                    previousValue + "->" + value);
            }

            rule.conditionText = value;

            var saveSuccess = (rule.conditionText == value);
            this.box.setAttribute("saveSuccess", saveSuccess);
        }
        else if (rule instanceof window.CSSCharsetRule)
        {
            target.textContent = value;

            if (FBTrace.DBG_CSS)
                FBTrace.sysout("CSSEditor.saveEdit: @charset: " + previousValue + "->" + value);

            rule.encoding = value;
        }

        Firebug.Inspector.repaint();

        this.panel.markChange(this.panel.name == "stylesheet");

        if (FBTrace.DBG_CSS)
            FBTrace.sysout("CSSEditor.saveEdit (ending) " + this.panel.name, value);
    },

    beginEditing: function(target, value)
    {
        var row = Dom.getAncestorByClass(target, "cssProp");
        this.initialValue = value;
        this.initiallyDisabled = (row && row.classList.contains("disabledStyle"));
    },

    endEditing: function(target, value, cancel)
    {
        if (!cancel && target.classList.contains("cssPropName"))
        {
            // Save changed property names here instead of in saveEdit, because otherwise
            // unrelated properties might get discarded (see issue 5204).
            var previous = this.initialValue;
            if (FBTrace.DBG_CSS)
            {
                FBTrace.sysout("CSSEditor.endEditing: renaming property " + previous + " -> " +
                    value);
            }

            var cssRule = Dom.getAncestorByClass(target, "cssRule");
            var rule = Firebug.getRepObject(cssRule);
            var baseText = rule.style ? rule.style.cssText : rule.cssText;
            var prop = Dom.getAncestorByClass(target, "cssProp");
            var propValue = Dom.getChildByClass(prop, "cssPropValue").textContent;
            var parsedValue = parsePriority(propValue);

            if (previous)
                CSSModule.removeProperty(rule, previous);
            if (propValue)
                CSSModule.setProperty(rule, value, parsedValue.value, parsedValue.priority);

            Events.dispatch(CSSModule.fbListeners, "onCSSPropertyNameChanged", [rule, value,
                    previous, baseText]);

            Firebug.Inspector.repaint();
            this.panel.markChange(this.panel.name == "stylesheet");
        }
        return true;
    },

    cancelEditing: function(target, value)
    {
        if (this.initiallyDisabled)
        {
            // Disable the property again.
            var row = Dom.getAncestorByClass(target, "cssProp");
            if (row && !row.classList.contains("disabledStyle"))
                this.panel.disablePropertyRow(row);
        }
    },

    advanceToNext: function(target, charCode)
    {
        if (charCode == 58 /*":"*/ && Css.hasClass(target, "cssPropName"))
        {
            return true;
        }
        else if (charCode == 59 /*";"*/ && Css.hasClass(target, "cssPropValue"))
        {
            var cssValue = CSSModule.parseCSSValue(this.input.value, this.input.selectionStart);
            // Simple test, if we are inside a string (see issue 4543)
            var isValueInString = (cssValue.value.indexOf("\"") != -1);

            return !isValueInString;
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    getAutoCompleteRange: function(value, offset)
    {
        if (!Css.hasClass(this.target, "cssPropValue"))
            return {start: 0, end: value.length};

        var propRow = Dom.getAncestorByClass(this.target, "cssProp");
        var propName = Dom.getChildByClass(propRow, "cssPropName").textContent.toLowerCase();

        if (propName == "font" || propName == "font-family")
            return CSSModule.parseCSSFontFamilyValue(value, offset, propName);
        else
            return CSSModule.parseCSSValue(value, offset);
    },

    getAutoCompleteList: function(preExpr, expr, postExpr, range, cycle, context, out)
    {
        if (Dom.getAncestorByClass(this.target, "importRule"))
        {
            return [];
        }
        else if (Dom.getAncestorByClass(this.target, "cssCharsetRule"))
        {
            return Css.charsets;
        }
        else if (Css.hasClass(this.target, "cssPropName"))
        {
            var nodeType = Xml.getElementSimpleType(Firebug.getRepObject(this.target));
            var ret = Css.getCSSPropertyNames(nodeType);

            if (!cycle && expr)
            {
                // Make some good default suggestions.
                var list = ["color", "clear", "display", "float", "overflow"];
                for (var i = 0; i < list.length; ++i)
                {
                    if (Str.hasPrefix(list[i], expr) && ret.indexOf(list[i]) !== -1)
                    {
                        out.suggestion = list[i];
                        break;
                    }
                }
            }

            return ret;
        }
        else if (Dom.getAncestorByClass(this.target, "cssDocumentRule") &&
                !Css.hasClass(this.target, "cssPropValue"))
        {
            return Css.documentConditions;
        }
        else if (Dom.getAncestorByClass(this.target, "cssKeyframesRule") &&
            !Css.hasClass(this.target, "cssPropValue"))
        {
            return Object.getOwnPropertyNames(Css.keyframeKeys);
        }
        else if (Dom.getAncestorByClass(this.target, "cssMediaRule") &&
            !Css.hasClass(this.target, "cssPropValue"))
        {
            return Css.mediaTypes;
        }
        else
        {
            if (expr.charAt(0) === "!")
                return ["!important"];

            var row = Dom.getAncestorByClass(this.target, "cssProp");
            var propName = Dom.getChildByClass(row, "cssPropName").textContent;
            var nodeType = Xml.getElementSimpleType(Firebug.getRepObject(this.target));

            var keywords;
            if (range.type === "url")
            {
                // We can't complete urls yet.
                return [];
            }
            else if (range.type === "fontFamily")
            {
                keywords = Css.cssKeywords["fontFamily"].slice();
                if (this.panel && this.panel.context)
                {
                    // Add the fonts used in this context (they might be inaccessible
                    // for this element, but probably aren't).
                    var fonts = Fonts.getFontsUsedInContext(this.panel.context), ar = [];
                    for (var i = 0; i < fonts.length; i++)
                        ar.push(fonts[i].CSSFamilyName);
                    keywords = Arr.sortUnique(keywords.concat(ar));
                }

                var q = expr.charAt(0), isQuoted = (q === '"' || q === "'");
                if (!isQuoted)
                {
                    // Default to ' quotes, unless " occurs somewhere.
                    q = (/"/.test(preExpr + postExpr) ? '"' : "'");
                }

                // Don't complete '.
                if (expr.length <= 1 && isQuoted)
                    return [];

                // When completing, quote fonts if the input is quoted; when
                // cycling, quote them instead in the way the user seems to
                // expect to have them quoted.
                var reSimple = /^[a-z][a-z0-9-]*$/i;
                var isComplex = !reSimple.test(expr.replace(/^['"]?|['"]?$/g, ""));
                var quote = function(str)
                {
                    if (!cycle || isComplex !== isQuoted)
                        return (isQuoted ? q + str + q : str);
                    else
                        return (reSimple.test(str) ? str : q + str + q);
                };

                keywords = keywords.slice();
                for (var i = 0; i < keywords.length; ++i)
                {
                    // Treat values starting with capital letters as font names
                    // that can be quoted.
                    var k = keywords[i];
                    if (k.charAt(0).toLowerCase() !== k.charAt(0))
                        keywords[i] = quote(k);
                }
            }
            else
            {
                var lowerProp = propName.toLowerCase(), avoid;
                if (["background", "border", "font"].indexOf(lowerProp) !== -1)
                {
                    if (cycle)
                    {
                        // Cycle only within the same category, if possible.
                        var cat = Css.getCSSShorthandCategory(nodeType, lowerProp, expr);
                        if (cat)
                            return (cat in Css.cssKeywords ? Css.cssKeywords[cat] : [cat]);
                    }
                    else
                    {
                        // Avoid repeated properties. We assume the values to be solely
                        // space-separated tokens, within a comma-separated part (like
                        // for CSS3 multiple backgrounds). This is absolutely wrong, but
                        // good enough in practice because non-tokens for which it fails
                        // likely aren't in any category.
                        // "background-position" and "background-repeat" values can occur
                        // twice, so they are special-cased.
                        avoid = [];
                        var preTokens = preExpr.split(",").reverse()[0].split(" ");
                        var postTokens = postExpr.split(",")[0].split(" ");
                        var tokens = preTokens.concat(postTokens);
                        for (var i = 0; i < tokens.length; ++i)
                        {
                            var cat = Css.getCSSShorthandCategory(nodeType, lowerProp, tokens[i]);
                            if (cat && cat !== "position" && cat !== "bgRepeat")
                                avoid.push(cat);
                        }
                    }
                }
                keywords = Css.getCSSKeywordsByProperty(nodeType, propName, avoid);
            }

            // Add the magic inherit property, if it's sufficiently alone.
            // XXX Firefox 19 also has "initial"
            if (!preExpr)
                keywords = keywords.concat(["inherit"]);

            if (!cycle)
            {
                // Make some good default suggestions.
                var list = ["white", "black", "solid", "outset", "repeat"];
                for (var i = 0; i < list.length; ++i)
                {
                    if (Str.hasPrefix(list[i], expr) && keywords.indexOf(list[i]) !== -1)
                    {
                        out.suggestion = list[i];
                        break;
                    }
                }
            }

            return SelectorEditor.stripCompletedParens(keywords, postExpr);
        }
    },

    getAutoCompletePropSeparator: function(range, expr, prefixOf)
    {
        if (!Css.hasClass(this.target, "cssPropValue"))
            return null;

        // For non-multi-valued properties, fail (pre-completions don't make sense,
        // and it's less risky).
        var row = Dom.getAncestorByClass(this.target, "cssProp");
        var propName = Dom.getChildByClass(row, "cssPropName").textContent;
        if (!Css.multiValuedProperties.hasOwnProperty(propName))
            return null;

        if (range.type === "fontFamily")
            return ",";
        return " ";
    },

    autoCompleteAdjustSelection: function(value, offset)
    {
        if (offset >= 2 && value.substr(offset-2, 2) === "()")
            return offset-1;
        return offset;
    },

    doIncrementValue: function(value, amt, offset, offsetEnd)
    {
        var propName = null;
        if (Css.hasClass(this.target, "cssPropValue"))
        {
            var propRow = Dom.getAncestorByClass(this.target, "cssProp");
            propName = Dom.getChildByClass(propRow, "cssPropName").textContent;
        }

        var range = CSSModule.parseCSSValue(value, offset);
        var type = (range && range.type) || "";
        var expr = (range ? value.substring(range.start, range.end) : "");

        var completion = null, selection, info;
        if (type === "int")
        {
            if (propName === "opacity")
            {
                info = {minValue: 0, maxValue: 1};
                amt /= 100;
            }

            if (expr === "0" && value.lastIndexOf("(", offset) === -1 &&
                !Css.unitlessProperties.hasOwnProperty(propName))
            {
                // 0 is a length, and incrementing it normally will result in an
                // invalid value 1 or -1.  Thus, guess at a unit to add.
                var unitM = /\d([a-z]{1,4})/.exec(value);
                expr += (unitM ? unitM[1] : "px");
            }

            var newValue = this.incrementExpr(expr, amt, info);
            if (newValue !== null)
            {
                completion = newValue;
                selection = [0, completion.length];
            }
        }
        else if (type === "rgb" && expr.charAt(0) === "#")
        {
            var offsetIntoExpr = offset - range.start;
            var offsetEndIntoExpr = offsetEnd - range.start;

            // Increment a hex color.
            var res = this.incrementHexColor(expr, amt, offsetIntoExpr, offsetEndIntoExpr);
            if (res)
            {
                completion = res.value;
                selection = res.selection;
            }
        }
        else
        {
            if (type === "rgb" || type === "hsl")
            {
                info = {};
                var part = value.substring(range.start, offset).split(",").length - 1;
                if (part === 3) // alpha
                {
                    info.minValue = 0;
                    info.maxValue = 1;
                    amt /= 100;
                }
                else if (type === "rgb") // rgb color
                {
                    info.minValue = 0;
                    info.maxValue = 255;
                    if (Math.abs(amt) < 1)
                        amt = (amt < 0 ? -1 : 1);
                }
                else if (part !== 0) // hsl percentage
                {
                    info.minValue = 0;
                    info.maxValue = 100;

                    // If the selection is at the end of a percentage sign, select
                    // the previous number. This would have been less hacky if
                    // parseCSSValue parsed functions recursively.
                    if (value.charAt(offset-1) === "%")
                        --offset;
                }
            }

            return Firebug.InlineEditor.prototype.doIncrementValue
                .call(this, value, amt, offset, offsetEnd, info);
        }

        if (completion === null)
            return;

        var preExpr = value.substr(0, range.start);
        var postExpr = value.substr(range.end);

        return {
            value: preExpr + completion + postExpr,
            start: range.start + selection[0],
            end: range.start + selection[1]
        };
    },

    incrementHexColor: function(expr, amt, offset, offsetEnd)
    {
        // Return early if no part of the expression is selected.
        if (offsetEnd > expr.length && offset >= expr.length)
            return;
        if (offset < 1 && offsetEnd <= 1)
            return;

        // Ignore the leading #.
        expr = expr.substr(1);
        --offset;
        --offsetEnd;

        // Clamp the selection to within the actual value.
        offset = Math.max(offset, 0);
        offsetEnd = Math.min(offsetEnd, expr.length);
        offsetEnd = Math.max(offsetEnd, offset);

        // Normalize #ABC -> #AABBCC.
        if (expr.length === 3)
        {
            expr = expr.charAt(0) + expr.charAt(0) +
                   expr.charAt(1) + expr.charAt(1) +
                   expr.charAt(2) + expr.charAt(2);
            offset *= 2;
            offsetEnd *= 2;
        }
        if (expr.length !== 6)
            return;

        if (offset === offsetEnd)
        {
            // There is only a single cursor position. Increment an adjacent
            // color, preferably one to the left.
            if (offset === 0)
                offsetEnd = 1;
            else
                offset = offsetEnd - 1;
        }

        // Make the selection cover entire parts.
        offset -= offset%2;
        offsetEnd += offsetEnd%2;

        // Remap the increments from [0.1, 1, 10, 100] to [1, 1, 16, 64].
        if (-1 < amt && amt < 1)
            amt = (amt < 0 ? -1 : 1);
        if (Math.abs(amt) === 10)
            amt = (amt < 0 ? -16 : 16);
        if (Math.abs(amt) === 100)
            amt = (amt < 0 ? -64 : 64);

        var isUpper = (expr.toUpperCase() === expr);

        for (var pos = offset; pos < offsetEnd; pos += 2)
        {
            // Increment the part in [pos, pos+2).
            var mid = expr.substr(pos, 2);
            var value = parseInt(mid, 16);
            if (isNaN(value))
                return;

            mid = Math.min(Math.max(value - amt, 0), 255).toString(16);
            while (mid.length < 2)
                mid = "0" + mid;

            // Make the incremented part upper-case if the original value can be
            // seen as such (this should happen even for, say, #444444, because
            // upper-case hex-colors are the default). Otherwise, the lower-case
            // result from .toString is used.
            if (isUpper)
                mid = mid.toUpperCase();

            expr = expr.substr(0, pos) + mid + expr.substr(pos+2);
        }

        return {value: "#" + expr, selection: [offset+1, offsetEnd+1]};
    }
});

// ********************************************************************************************* //
// CSSRuleEditor

function CSSRuleEditor(doc)
{
    this.initializeInline(doc);
}

CSSRuleEditor.prototype = domplate(SelectorEditor.prototype,
{
    insertNewRow: function(target, insertWhere)
    {
        var emptyRule = {
            selector: "",
            id: "",
            props: [],
            isSelectorEditable: true
        };

        if (insertWhere == "before")
            return CSSStyleRuleTag.tag.insertBefore({rule: emptyRule}, target);
        else
            return CSSStyleRuleTag.tag.insertAfter({rule: emptyRule}, target);
    },

    saveEdit: function(target, value, previousValue)
    {
        var context = this.panel.context;

        if (FBTrace.DBG_CSS)
            FBTrace.sysout("CSSRuleEditor.saveEdit: '" + value + "'  '" + previousValue +
                "'", target);

        target.textContent = value;
        if (value === previousValue)
            return;

        var row = Dom.getAncestorByClass(target, "cssRule");
        var rule = Firebug.getRepObject(target);

        var searchRule = rule || Firebug.getRepObject(row.nextSibling);
        var oldRule, ruleIndex;

        if (searchRule)
        {
            // take care of media rules
            var styleSheet = searchRule.parentRule || searchRule.parentStyleSheet;
            if (!styleSheet)
                return;

            var cssRules = styleSheet.cssRules;
            for (ruleIndex=0; ruleIndex<cssRules.length && searchRule!=cssRules[ruleIndex];
                ruleIndex++)
            {
            }

            if (rule)
                oldRule = searchRule;
            else
                ruleIndex++;
        }
        else
        {
            var styleSheet;
            if (this.panel.name === "stylesheet")
            {
                styleSheet = this.panel.location;
                if (!styleSheet)
                {
                    var doc = context.window.document;
                    this.panel.location = styleSheet =
                        CSSModule.getDefaultStyleSheet(doc);
                }
            }
            else
            {
                if (this.panel.name !== "css")
                    return;

                var doc = this.panel.selection.ownerDocument.defaultView.document;
                styleSheet = CSSModule.getDefaultStyleSheet(doc);
            }

            styleSheet = styleSheet.editStyleSheet ? styleSheet.editStyleSheet.sheet : styleSheet;
            cssRules = styleSheet.cssRules;
            ruleIndex = cssRules.length;
        }

        // Delete in all cases except for new add
        // We want to do this before the insert to ease change tracking
        if (oldRule)
        {
            CSSModule.deleteRule(styleSheet, ruleIndex);
        }

        var doMarkChange = true;

        // Firefox does not follow the spec for the update selector text case.
        // When attempting to update the value, firefox will silently fail.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=37468 for the quite
        // old discussion of this bug.
        // As a result we need to recreate the style every time the selector
        // changes.
        if (value)
        {
            var cssText = [ value, "{" ];
            var props = row.getElementsByClassName("cssProp");
            for (var i = 0; i < props.length; i++)
            {

                var propEl = props[i];
                if (!Css.hasClass(propEl, "disabledStyle"))
                {
                    var propName = Dom.getChildByClass(propEl, "cssPropName").textContent;
                    var propValue = Dom.getChildByClass(propEl, "cssPropValue").textContent;
                    cssText.push(propName + ":" + propValue + ";");
                }
            }

            cssText.push("}");
            cssText = cssText.join("");

            try
            {
                var insertLoc = CSSModule.insertRule(styleSheet, cssText, ruleIndex);

                rule = cssRules[insertLoc];

                ruleIndex++;

                var saveSuccess = (this.panel.name != "css");
                if (!saveSuccess)
                {
                    saveSuccess = (this.panel.selection &&
                        this.panel.selection.mozMatchesSelector(value)) ? true : 'almost';
                }

                this.box.setAttribute('saveSuccess', saveSuccess);
            }
            catch (err)
            {
                if (FBTrace.DBG_CSS || FBTrace.DBG_ERRORS)
                    FBTrace.sysout("CSS Insert Error: "+err, err);

                target.textContent = previousValue;
                // create dummy rule to be able to recover from error
                var insertLoc = CSSModule.insertRule(styleSheet,
                    'selectorSavingError{}', ruleIndex);
                rule = cssRules[insertLoc];

                this.box.setAttribute('saveSuccess', false);

                doMarkChange = false;
            }
        }
        else
        {
            // XXX There is currently no way to re-add the rule after this happens.
            rule = undefined;
        }

        // Update the rep object
        row.repObject = rule;
        if (oldRule && rule)
            this.panel.remapRule(context, oldRule, rule);

        if (doMarkChange)
            this.panel.markChange(this.panel.name == "stylesheet");
    },

    getAutoCompleteRange: function(value, offset)
    {
        if (!Css.hasClass(this.target, "cssSelector"))
            return;
        return SelectorEditor.prototype.getAutoCompleteRange.apply(this, arguments);
    },

    getAutoCompleteList: function(preExpr, expr, postExpr, range, cycle, context, out)
    {
        if (!Css.hasClass(this.target, "cssSelector"))
            return [];
        return SelectorEditor.prototype.getAutoCompleteList.apply(this, arguments);
    },

    getAutoCompletePropSeparator: function(range, expr, prefixOf)
    {
        if (!Css.hasClass(this.target, "cssSelector"))
            return null;
        return SelectorEditor.prototype.getAutoCompletePropSeparator.apply(this, arguments);
    },

    advanceToNext: function(target, charCode)
    {
        if (charCode == 123 /* "{" */)
        {
            return true;
        }
    }
});

// ********************************************************************************************* //
// StyleSheetEditor

/**
 * StyleSheetEditor represents the full-sized editor used for Source/Live Edit
 * within the CSS panel.
 */
function StyleSheetEditor(doc)
{
    this.box = this.tag.replace({}, doc, this);
    this.input = this.box.firstChild;
}

StyleSheetEditor.prototype = domplate(Firebug.BaseEditor,
{
    multiLine: true,

    tag: DIV(
        TEXTAREA({"class": "styleSheetEditor fullPanelEditor", oninput: "$onInput"})
    ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    getValue: function()
    {
        return this.input.value;
    },

    setValue: function(value)
    {
        return this.input.value = value;
    },

    show: function(target, panel, value, textSize)
    {
        this.target = target;
        this.panel = panel;

        this.panel.panelNode.appendChild(this.box);

        this.input.value = value;
        this.input.focus();

        // match CSSModule.getEditorOptionKey
        var command = Firebug.chrome.$("cmd_firebug_togglecssEditMode");
        command.setAttribute("checked", true);
    },

    hide: function()
    {
        var command = Firebug.chrome.$("cmd_firebug_togglecssEditMode");
        command.setAttribute("checked", false);

        if (this.box.parentNode == this.panel.panelNode)
            this.panel.panelNode.removeChild(this.box);

        delete this.target;
        delete this.panel;
        delete this.styleSheet;
    },

    saveEdit: function(target, value, previousValue)
    {
        if (FBTrace.DBG_CSS)
            FBTrace.sysout("StyleSheetEditor.saveEdit", arguments);

        CSSModule.freeEdit(this.styleSheet, value);
    },

    beginEditing: function()
    {
        if (FBTrace.DBG_CSS)
            FBTrace.sysout("StyleSheetEditor.beginEditing", arguments);

        this.editing = true;
    },

    endEditing: function()
    {
        if (FBTrace.DBG_CSS)
            FBTrace.sysout("StyleSheetEditor.endEditing", arguments);

        this.editing = false;
        this.panel.refresh();
        return true;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    onInput: function()
    {
        Firebug.Editor.update();
    },

    scrollToLine: function(line, offset)
    {
        this.startMeasuring(this.input);
        var lineHeight = this.measureText().height;
        this.stopMeasuring();

        this.input.scrollTop = (line * lineHeight) + offset;
    }
});

Firebug.StyleSheetEditor = StyleSheetEditor;

// ********************************************************************************************* //

Firebug.CSSDirtyListener = function(context)
{
};

Firebug.CSSDirtyListener.isDirty = function(styleSheet, context)
{
    return (styleSheet.fbDirty == true);
};

Firebug.CSSDirtyListener.prototype =
{
    markSheetDirty: function(styleSheet)
    {
        if (!styleSheet && FBTrace.DBG_ERRORS)
        {
            FBTrace.sysout("css; CSSDirtyListener markSheetDirty; styleSheet == NULL");
            return;
        }

        styleSheet.fbDirty = true;

        if (FBTrace.DBG_CSS)
            FBTrace.sysout("CSSDirtyListener markSheetDirty " + styleSheet.href, styleSheet);
    },

    onCSSInsertRule: function(styleSheet, cssText, ruleIndex)
    {
        this.markSheetDirty(styleSheet);
    },

    onCSSDeleteRule: function(styleSheet, ruleIndex)
    {
        this.markSheetDirty(styleSheet);
    },

    onCSSSetProperty: function(style, propName, propValue, propPriority, prevValue,
        prevPriority, rule, baseText)
    {
        var styleSheet = rule.parentStyleSheet;
        if (styleSheet)
            this.markSheetDirty(styleSheet);
    },

    onCSSRemoveProperty: function(style, propName, prevValue, prevPriority, rule, baseText)
    {
        var styleSheet = rule.parentStyleSheet;
        if (styleSheet)
            this.markSheetDirty(styleSheet);
    }
};

// ********************************************************************************************* //
// Local Helpers

function parsePriority(value)
{
    var rePriority = /(.*?)\s*(!important)?$/;
    var m = rePriority.exec(value);
    var propValue = m ? m[1] : "";
    var priority = m && m[2] ? "important" : "";
    return {value: propValue, priority: priority};
}

function formatColor(color)
{
    switch (Options.get("colorDisplay"))
    {
        case "hex":
            return Css.rgbToHex(color);

        case "hsl":
            return Css.rgbToHSL(color);

        case "rgb":
            return Css.colorNameToRGB(color);

        default:
            return color;
    }
}

function getRuleLine(rule)
{
    // TODO return closest guess if rule isn't CSSStyleRule
    // and keep track of edited rule lines
    try
    {
        return Dom.domUtils.getRuleLine(rule);
    }
    catch (e) {}
    return 0;
}

function getOriginalStyleSheetCSS(sheet, context)
{
    if (sheet.ownerNode instanceof window.HTMLStyleElement)
    {
        return sheet.ownerNode.textContent;
    }
    else
    {
        // In the case, that there are no rules, the cache will return a message
        // to reload the source (see issue 4251)
        return sheet.cssRules.length != 0 ? context.sourceCache.load(sheet.href).join("") : "";
    }
}

function getStyleSheetCSS(sheet, context)
{
    function beautify(css, indent)
    {
        var indent='\n'+Array(indent+1).join(' ');
        var i=css.indexOf('{');
        var match=css.substr(i+1).match(/(?:[^;\(]*(?:\([^\)]*?\))?[^;\(]*)*;?/g);
        match.pop();
        match.pop();
        return css.substring(0, i+1) + indent
                + match.sort().join(indent) + '\n}';
    }

    var cssRules = sheet.cssRules, css=[];
    for(var i = 0; i < cssRules.length; i++)
    {
        var rule = cssRules[i];
        if (rule instanceof window.CSSStyleRule)
            css.push(beautify(rule.cssText, 4));
        else
            css.push(rule.cssText);
    }

    return Css.rgbToHex(css.join('\n\n')) + '\n';
}

function scrollSelectionIntoView(panel)
{
    var selCon = getSelectionController(panel);
    selCon.scrollSelectionIntoView(
        Ci.nsISelectionController.SELECTION_NORMAL,
        Ci.nsISelectionController.SELECTION_FOCUS_REGION, true);
}

function getSelectionController(panel)
{
    var browser = Firebug.chrome.getPanelBrowser(panel);
    return browser.docShell.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsISelectionDisplay)
        .QueryInterface(Ci.nsISelectionController);
}

// ********************************************************************************************* //
// Registration

Firebug.registerPanel(Firebug.CSSStyleSheetPanel);

return Firebug.CSSStyleSheetPanel;

// ********************************************************************************************* //
}});
