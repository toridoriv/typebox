import fs from "node:fs";

import mustache from "mustache";
import * as prettier from "prettier";
import ts from "typescript";

import * as utils from "./utils.js";

/* -------------------------------------------------------------------------- */
/*                                Class Method                                */
/* -------------------------------------------------------------------------- */
export class Method {
  /**
   * Initializes a new Method instance.
   *
   * @param {ProgramGenerator} generator - The program generator instance.
   * @param {string}           name      - The original name of the method.
   * @returns {Method} The new Method instance.
   */
  static init(generator, name) {
    return new Method(name, generator);
  }

  /**
   * All the TypeScript {@link ts.MethodDeclaration} associated under
   * the same name.
   *
   * @type {NamedMethodDeclaration[]}
   */
  declarations = [];

  /**
   * @param {string}           name      - The original name of the method.
   * @param {ProgramGenerator} generator - The program generator instance.
   */
  constructor(name, generator) {
    /**
     * The name of this method.
     */
    this.name = name;

    /**
     * The description for this method.
     */
    this.description = `Creates an schema for a ${this.name} type.`;

    /**
     * A reference to the {@link ProgramGenerator} that created this method instance.
     */
    this.generator = generator;

    /**
     * Details about the parameters for this method.
     */
    this.parameters = {
      /**
       * The names of the method parameters.
       *
       * @type {string[]}
       */
      names: [],
    };
  }

  /**
   * Adds the names of the parameters from the declarations to the `parameters.names`
   * array if they don't already exist.
   */
  #step1_addParametersNames() {
    this.declarations
      .map(utils.pickProperty("parameters"))
      .flat()
      .filter(utils.hasProperty("name"))
      .map(utils.pickProperty("name"))
      .forEach((name) => {
        const nameTxt = name.getText();

        if (!this.parameters.names.includes(nameTxt)) {
          this.parameters.names.push(nameTxt);
        }
      });

    return this;
  }

  /**
   * Adds the provided declarations to the internal array of declarations.
   *
   * @param {NamedMethodDeclaration[]} declarations
   */
  addDeclarations(...declarations) {
    this.declarations.push(...declarations);

    return this;
  }

  /**
   * Triggers initialization tasks for the method, such as adding parameter names.
   */
  triggerInitTasks() {
    return this.#step1_addParametersNames();
  }

  /**
   * Generates template data for this method based on its declarations.
   *
   * @returns Object containing name, JSDoc comment, and comma-separated parameter
   *          list.
   */
  getTemplateData() {
    const commentLines = [utils.Jsdoc.start];

    commentLines.push(`${utils.Jsdoc.description.render(this)}`, utils.Jsdoc.emptyLine);

    commentLines.push(utils.Jsdoc.end);

    return {
      name: this.name,
      comment: commentLines.join("\n"),
      parameters: this.parameters.names.join(", "),
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                           Class Program Generator                          */
/* -------------------------------------------------------------------------- */
export class ProgramGenerator {
  /**
   * Configuration object that defines parameters for generating TypeScript type
   * definitions from the configured builder classes.
   */
  static config = Object.freeze({
    dir: "node_modules/@sinclair/typebox/build/import/type/type",
    /**
     * Class names that will be used to generate TypeScript type definitions.
     */
    builders: ["JavaScriptTypeBuilder", "JsonTypeBuilder"],
    /**
     * Root source files that will be used to generate TypeScript type definitions for the
     * configured builder classes.
     */
    get rootFiles() {
      return [`${this.dir}/json.d.mts`, `${this.dir}/javascript.d.mts`];
    },
    /**
     * Template is used to generate the output for the configured builders.
     */
    template: fs.readFileSync("./templates/builder.mustache", "utf-8"),
  });

  /**
   * Checks if the given source file is one of the root files configured for this Program
   * Generator.
   *
   * @param {ts.SourceFile} source - The source file to check.
   * @returns {boolean} Whether the source file is a root file.
   */
  static isRootFileSource = (source) => {
    return this.config.rootFiles.includes(source.fileName);
  };

  /**
   * Checks if the given Node is a named ClassDeclaration.
   *
   * @param {ts.Node} node - The Node to check.
   * @returns {node is NamedClassDeclaration}
   */
  static isClassDeclaration = (node) => {
    return ts.isClassDeclaration(node) && node.name !== undefined;
  };

  /**
   * Checks if the given named {@link ts.ClassDeclaration} is one of the builder
   * classes configured in `ProgramGenerator`.
   *
   * @param {NamedClassDeclaration} classDecl - The ClassDeclaration node to check.
   * @returns {boolean}
   */
  static isBuilderClassDeclaration = (classDecl) => {
    return this.config.builders.includes(classDecl.name.text);
  };

  /**
   * Gets the text of the given TypeScript property name node.
   *
   * @param {ts.PropertyName} propertyName - The property name node to get the text for.
   * @returns {string} The text of the property name node.
   */
  static getNameText = (propertyName) => {
    return propertyName.getText();
  };

  /**
   * @param {Record<string, any>} replacements
   */
  static renderTemplate(replacements) {
    return mustache.render(this.config.template, replacements, undefined, {
      tags: ["<%", "%>"],
      escape(value) {
        return value;
      },
    });
  }

  /**
   * Named {@link ts.ClassDeclaration} nodes for builder classes configured in the static config.
   *
   * @type {NamedClassDeclaration[]}
   */
  builders = [];

  /**
   * An array containing the internal type names used by the library.
   */
  internalTypes = [
    "Static",
    "TSchema",
    "TMappedResult",
    "TEnumKey",
    "TEnumValue",
    "TTemplateLiteral",
    "TMappedKey",
    "TLiteralValue",
    "TMappedFunction",
    "TMapped",
    "TProperties",
    "TIndexPropertyKeys",
    "TTemplateLiteralKind",
  ];

  get internalTypePattern() {
    return new RegExp(this.internalTypes.join("|"), "g");
  }

  /**
   * Named {@link ts.MethodDeclaration} nodes wrapped by the custom class {@link Method},
   * representing methods from builder classes.
   *
   * @type {Method[]}
   */
  methods = [];

  /**
   * The TypeScript program that allows us to load and analyze the source files to
   * generate the TypeScript definitions.
   */
  tsProgram = ts.createProgram(this.super.config.rootFiles, {});

  /**
   * A TypeScript type checker that can be used to semantically analyze source files in
   * the program.
   */
  typeChecker = this.tsProgram.getTypeChecker();

  /**
   * The source files in the TypeScript program that are configured as root files for this
   * generator.
   */
  sources = this.tsProgram.getSourceFiles().filter(this.super.isRootFileSource);

  constructor() {
    this.#fillBuilders().#fillOptionTypeNames().#fillMethods();
    utils.hideProperties(this, "tsProgram", "typeChecker");
  }

  /**
   * Fills the builders array with NamedClassDeclaration nodes for any builder classes
   * configured in the static config.
   *
   * @returns {this}
   */
  #fillBuilders() {
    this.sources.forEach((source) => {
      source.forEachChild((node) => {
        if (this.super.isClassDeclaration(node)) {
          if (this.super.isBuilderClassDeclaration(node)) {
            this.builders.push(node);
          }
        }
      });
    });

    return this;
  }

  /**
   * Adds the TypeBox Options object types to {@link ProgramGenerator.internalTypes}.
   */
  #fillOptionTypeNames() {
    let fullText = "";

    this.sources.forEach((source) => {
      fullText += source.getFullText() + "\n";
    });

    this.internalTypes.push(
      ...utils.getUnique(
        [...fullText.matchAll(/\w+Options /g)].map(utils.pickProperty(0)).map(utils.trim),
      ),
    );

    return this;
  }

  /**
   * Fills the methods array with {@link Method} instances.
   *
   * @returns {this}
   */
  #fillMethods() {
    const rawMethods = this.builders
      .map(utils.pickProperty("members"))
      .flat()
      .filter(ts.isMethodDeclaration)
      .filter(utils.hasProperty("name"));

    const names = utils
      .getUnique(rawMethods.map(utils.pickProperty("name")).map(this.super.getNameText))
      .sort(utils.compareAlphabetically);

    names.map(utils.addPrefix.bind(null, "T", "")).forEach((v) => {
      if (!this.internalTypes.includes(v)) {
        this.internalTypes.push(v);
      }
    });

    const groupings = utils.groupBy(rawMethods, (el) => this.super.getNameText(el.name));

    this.methods.push(...names.map(Method.init.bind(null, this)));

    this.methods.forEach((method) => {
      method.addDeclarations(...groupings[method.name]);
      method.triggerInitTasks();
    });

    return this;
  }

  /**
   * Patches internal type references in a string value by prefixing them with the
   * `typebox`
   * namespace.
   *
   * @param {string} value - The string value to patch.
   * @returns {string} The patched string.
   */
  patchType = (value) => {
    const items = utils.getUnique(
      Array.from(value.matchAll(this.internalTypePattern)).map(utils.pickProperty(0)),
    );
    let patch = value;

    items.forEach((item) => {
      if (this.internalTypes.includes(item)) {
        patch = patch.replaceAll(item, utils.addPrefix("typebox", ".", item));
      }
    });

    return patch.trim();
  };

  /**
   * Writes the rendered template content to the given file path.
   * Formats the content using Prettier before writing to the file.
   *
   * @param {string} path - The file path to write the content to.
   * @returns {Promise<void>}
   */
  async writeToFile(path) {
    const content = this.super.renderTemplate({
      methods: this.methods.map((m) => m.getTemplateData()),
    });
    const options = await prettier.resolveConfig(path);
    const formatted = await prettier.format(content, options || {});

    return fs.writeFileSync(path, formatted, "utf-8");
  }

  /**
   * The `ProgramGenerator` constructor.
   *
   * @type {typeof ProgramGenerator}
   */
  get super() {
    return utils.coerce(this.constructor);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Typings                                  */
/* -------------------------------------------------------------------------- */

/**
 * A named {@link ts.ClassDeclaration}.
 *
 * @typedef {utils.SetRequired<ts.ClassDeclaration, "name">} NamedClassDeclaration
 */

/**
 * A named {@link ts.MethodDeclaration}.
 *
 * @typedef {utils.SetRequired<ts.MethodDeclaration, "name">} NamedMethodDeclaration
 */
