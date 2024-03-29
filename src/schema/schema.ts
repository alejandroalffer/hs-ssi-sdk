import { ISchema, ISchemaTemplateSchema, ISchemaTemplate } from "./ISchema";
import { v4 as uuidv4 } from "uuid";
import * as constant from "../constants";
import Utils from "../utils";
import axios from "axios";
import IOptions from "../IOptions";

const SC_PREFIX = "sch_";
const SCHEMA_URL = "https://json-schema.org/draft-07/schema#";
const W3_SCHEMA_JSON_URL =
  "https://w3c-ccg.github.io/vc-json-schemas/schema/1.0/schema.json";

class SchemaTemplateSchema implements ISchemaTemplateSchema {
  $schema: string;
  description: string;
  type: string;
  properties: any;
  required: Array<string>;
  additionalProperties: boolean;
  constructor({
    properties,
    additionalProperties,
    description,
  }: ISchemaTemplateSchema) {
    this.$schema = SCHEMA_URL;
    this.description = description;
    this.type = "object";
    this.properties = {};
    this.required = Object.keys(properties); // TODO: right now all requried... later we can change this.
    this.additionalProperties = additionalProperties as boolean;
    this.required.forEach((key) => {
      this.properties[`${key}`] = {
        type: typeof properties[key] ? typeof properties[key] : "string",
      };
    });
  }

  get(): ISchemaTemplateSchema {
    return this;
  }
}

export interface IScheme {
  schemaUrl: string;
  generateSchema({
    name,
    author,
    description,
    properties,
  }: ISchema): Promise<ISchemaTemplate>;
  registerSchema(schema: ISchemaTemplate): Promise<any>;
  getSchema(options: {schemaId?: string, author?: string}): Promise<any>;
}

export default class Schema implements IScheme {
  private utils: Utils;
  schemaUrl: string;
  constructor(options: IOptions) {
    this.utils = new Utils({ nodeUrl: options.nodeUrl });
    this.schemaUrl = this.utils.nodeurl + constant.HYPERSIGN_NETWORK_SCHEMA_EP;
  }

  public async generateSchema({
    name,
    author,
    description,
    properties,
  }: ISchema): Promise<ISchemaTemplate> {
    let newSchema: ISchemaTemplate = {} as ISchemaTemplate;

    const didDoc = await this.utils.resolve(author);
    if (!didDoc) throw new Error("Could not resolve author did");

    newSchema.type = W3_SCHEMA_JSON_URL;
    newSchema.modelVersion = "v1.0";
    newSchema.id = SC_PREFIX + uuidv4();
    newSchema.name = name;
    newSchema.author = author;
    newSchema.authored = new Date().toString();
    newSchema.schema = new SchemaTemplateSchema({
      properties,
      additionalProperties: false,
      description,
    }).get();
    return newSchema;
  }

  public async registerSchema(schema: ISchemaTemplate): Promise<any> {
    try {
      const response = await axios.post(this.schemaUrl, schema);
      return response.data;
    } catch (e) {
      const { response } = e;
      return response.data;
    }
  }

  public async getSchema(options: {schemaId?: string, author?: string}): Promise<any> {
    try {
      let get_didUrl = "";
      const { author, schemaId } = options;

      if(author != undefined && schemaId != undefined){ // 1,1
        get_didUrl = this.schemaUrl + schemaId + "?author=" + author;
      }

      else if(author == undefined && schemaId != undefined){ // 1,0
        get_didUrl = this.schemaUrl + schemaId;
      }

      else if(author != undefined && schemaId == undefined){ // 0,1
        get_didUrl = this.schemaUrl + "?author=" + author;
      }

      else if(author == undefined && schemaId == undefined){ // 0,0
        get_didUrl = this.schemaUrl;
      }
      
      const response = await axios.get(get_didUrl);
      return response.data;
    } catch (e) {
      const { response } = e;
      return response.data;
    }
  }
}
