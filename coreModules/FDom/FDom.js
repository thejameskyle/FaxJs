/*
 * FaxJs User Interface toolkit.
 *
 * Copyright (c) 2011 Jordan Walke
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 * I am providing code in this repository to you under an open source license.
 * Because this is my personal repository, the license you receive to my code
 * is from me and not from my employer (Facebook).
 *
 */

/**
 * FDom/FDom.js - core dom module for the FaxJs ui system. Low level building
 * blocks for javascript applications.
 */
var F = require('Fax');
var FUiStylers = require('./FUiStylers');
var FErrors = F.FErrors;
var FEvent = F.FEvent;
var FDomGeneration = F.FDomGeneration;
var FDomAttributes = F.FDomAttributes;
var FDomMutation = F.FDomMutation;
var FDomTraversal = F.FDomTraversal;

/* FDomGeneration */
var generateSingleDomAttributes = FDomGeneration.generateSingleDomAttributes;
var generateDomChildren = FDomGeneration.generateDomChildren;

/* FDomTraversal */
var extractChildrenLegacy = FDomTraversal.extractChildrenLegacy;

/* FDomMutation */
var controlSingleDomNode = FDomMutation.controlSingleDomNode;
var reconcileDomChildren = FDomMutation.reconcileDomChildren;

/* FDomAttributes */
var allTagAttrsAndHandlerNames = FDomAttributes.allTagAttrsAndHandlerNames;


/* Runtime resolved keys */
var CHILD_SET_KEY = F.keyOf({childSet: null});
var CHILD_LIST_KEY = F.keyOf({childList: null});
var CONTENT_KEY = F.keyOf({content: null});
var DANGEROUSLY_SET_INNER_HTML_KEY = F.keyOf({dangerouslySetInnerHtml: null});

/**
 * @makeDomContainerComponent: Creates a new javascript Class that is reactive,
 * and idempotent, capable of containing other reactive components. It has the
 * capabilities of accepting event handlers and dom attributes. In general, the
 * properties of a native tag component that is created are as follows: Event
 * handlers currently use top level event delegation exclusively in order to
 * divorce markup generation from controlling the dom (has other performance
 * benefits as well). More traditional TLED may be used at a later date.  All
 * Classes generated by this function support these in addition to others:
 *
 * --onClick:     fn  ... All events use TLED (top level event delegation)
 * --onMouseUp:   fn
 * --onMouseDown: fn ... (and many more events such as drag etc.)
 * --width:       dom tag attribute
 * --height:      "
 * --classSet:    "
 * --value:       " specially cased-rendered in tag, set on element at runtime
 * --(many more):   see *DomAttributes
 *
 * -Each native dom tag component accepts a style property as well.
 * --style: {width , height, .. }
 *
 * -Contained Children:
 *
 * -Methods of specifying children: (Choose *only* one method per use)
 * --@deprecated -> anyNameYouWant: SomeChild({..})
 * --childList: [SomeChild({}), AnotherChild({})]
 * --childSet: {anyNameYouWant: SomeChild({}), anyOtherName: Another({})
 *
 * -childSet is highly encouraged as it is much more powerful in terms of
 *  expressiveness (objects carry information about order and also item
 *  identity by key**)
 * -**Aside from one issue in Chrome browser only where keys are numeric (but
 *  you wouldn't do that anyways.
 */
var makeDomContainerComponent = exports.makeDomContainerComponent =
function(tag, optionalTagTextPar) {
  var optionalTagText =  optionalTagTextPar || '';
  var tagOpen = "<" + tag + optionalTagText;
  var tagClose = "</" + tag + ">";

  var NativeComponentConstructor = function(initProps) {
    this.props = initProps;
  };

  /**
   * @ConvenienceConstructor: When you instantiate a div({}), there's actually
   * a backing class called 'ActualDivClass'. Executing the div function simply
   * calls new ActualDivClass(props).
   */
  var ConvenienceConstructor = function(propsParam) {
    var props = propsParam || this;
    return new NativeComponentConstructor(props);
  };

  /**
   * @updateAllProps: Controls a native dom component after it has already been
   * allocated and attached to the dom.
   * - First reconcile the dom node itself.
   * - Then reconcile the children.
   */
  NativeComponentConstructor.prototype.updateAllProps = function(nextProps) {
    FErrors.throwIf(!this._rootDomId, FErrors.CONTROL_WITHOUT_BACKING_DOM);

    /* Control the header (and any content property) */
    this.rootDomNode = controlSingleDomNode(
        this.rootDomNode,
        this._rootDomId,
        nextProps,
        this.props);

    /* Mutate the properties. */
    this.props = nextProps;

    /* Control the children */
    reconcileDomChildren.call(
      this,
      nextProps[CHILD_LIST_KEY] ||
          nextProps[CHILD_SET_KEY] ||
          extractChildrenLegacy(nextProps)
    );
  };

  /**
   * @genMarkup:
   * - First generate the tag header markup itself.
   * - Then generate the children markup.
   * Some notes:
   * - The two properties .childList and .childSet could be unified into
   *   a single property called .children.
   * - The code path for extracting "legacy" children could be removed when
   *   no components are using that child specification format.
   */
  NativeComponentConstructor.prototype.genMarkup = function(idRoot) {
    var props = this.props;

    /* The open tag (and anything from content key) */
    var markup = tagOpen + generateSingleDomAttributes.call(this, idRoot);

    /* Children */
    markup += generateDomChildren.call(
      this,
      idRoot,
      props[CHILD_LIST_KEY] ||
          props[CHILD_SET_KEY] ||
          extractChildrenLegacy(props)
    );

    /* The footer */
    markup += tagClose;

    return markup;

  };

  return ConvenienceConstructor;
};


/**
 * Native dom "tag" components. Properties that you inject into these
 * convenience constructors correspond to either dom properties, or named
 * children. See the extensive comments above.
 */
var FDom = {
  Div: makeDomContainerComponent('div'),
  TextArea: makeDomContainerComponent('textarea'),
  Label: makeDomContainerComponent('label'),
  Ul: makeDomContainerComponent('ul'),
  Dl: makeDomContainerComponent('dl'),
  Dt: makeDomContainerComponent('dt'),
  Dd: makeDomContainerComponent('Dd'),
  P: makeDomContainerComponent('p'),
  Pre: makeDomContainerComponent('pre'),
  Hr: makeDomContainerComponent('hr'),
  Br: makeDomContainerComponent('br'),
  Img: makeDomContainerComponent('img'),
  A: makeDomContainerComponent('a'),
  Li: makeDomContainerComponent('li'),
  I: makeDomContainerComponent('i'),
  H1: makeDomContainerComponent('h1'),
  H2: makeDomContainerComponent('h2'),
  H3: makeDomContainerComponent('h3'),
  H4: makeDomContainerComponent('h4'),
  H5: makeDomContainerComponent('h5'),
  H6: makeDomContainerComponent('h6'),
  Span: makeDomContainerComponent('span'),
  Input: makeDomContainerComponent('input'),
  Button: makeDomContainerComponent('button'),
  Table: makeDomContainerComponent('table'),
  Tr: makeDomContainerComponent('tr'),
  Th: makeDomContainerComponent('th'),
  Td: makeDomContainerComponent('td'),
  IFrame: makeDomContainerComponent('iframe'),
  Select: makeDomContainerComponent('select'),
  Option: makeDomContainerComponent('option'),
  Checkbox: makeDomContainerComponent('checkbox'),
  stylers: FUiStylers
};

module.exports = FDom;
