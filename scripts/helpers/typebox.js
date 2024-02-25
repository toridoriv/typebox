import fs from "node:fs";

import ts from "typescript";

import * as utils from "./utils.js";

/* -------------------------------------------------------------------------- */
/*                                 Class Type                                 */
/* -------------------------------------------------------------------------- */
export class Type {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
  }
}

/* -------------------------------------------------------------------------- */
/*                                Class Generic                               */
/* -------------------------------------------------------------------------- */
export class Generic {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
  }

  renderAsName() {}

  renderAsType() {}
}

/* -------------------------------------------------------------------------- */
/*                                Class Method                                */
/* -------------------------------------------------------------------------- */
export class Method {
  /**
   * @param {string} name
   */
  static init(name) {
    return new Method(name);
  }

  /**
   * All the TypeScript {@link ts.MethodDeclaration} associated under
   * the same name.
   *
   * @type {NamedMethodDeclaration[]}
   */
  declarations = [];

  /**
   * @param {string} name
   */
  constructor(name) {
    /**
     * The name of this method.
     */
    this.name = name;
  }

  /**
   * @param {NamedMethodDeclaration[]} declarations
   */
  addDeclarations(...declarations) {
    this.declarations.push(...declarations);
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
    this.#fillBuilders().#fillMethods();
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

    this.methods.push(...names.map(Method.init));

    this.methods.forEach((method) => {
      method.addDeclarations(...groupings[method.name]);
    });

    return this;
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
