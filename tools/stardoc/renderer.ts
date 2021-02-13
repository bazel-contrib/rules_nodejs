import {TitleCasePipe} from '@angular/common';
import {readFileSync, writeFileSync} from 'fs';

import {AspectInfo, AttributeInfo, AttributeType, FunctionParamInfo, ModuleInfo, ProviderFieldInfo, ProviderInfo, RuleInfo, StarlarkFunctionInfo} from './stardoc_output_pb';

type AttributeObjectList = AttributeInfo.AsObject[]|FunctionParamInfo.AsObject[];

class MarkdownStardocRenderer {
  private readonly markdown = [];
  private readonly titleCasePipe = new TitleCasePipe();
  private readonly attributeTypes = new Map(
      Object.entries(AttributeType)
          .map(value => [value[1], this.titleCasePipe.transform(value[0].replace(/_/g, ' '))]));

  constructor(
      private readonly moduleInfo: ModuleInfo.AsObject, private readonly mdPreamble: string[] = [],
      private readonly fancy = false) {
    this.writeln(this.mdPreamble.join('\n'));
  }

  render(): string {
    this.moduleInfo.ruleInfoList?.forEach(info => this.renderRule(info));
    this.moduleInfo.funcInfoList?.forEach(info => this.renderFunction(info));
    this.moduleInfo.providerInfoList?.forEach(info => this.renderProvider(info));
    this.moduleInfo.aspectInfoList?.forEach(info => this.renderAspect(info));

    return this.markdown.join('');
  }

  hasContent(): boolean {
    return this.markdown.length > 0;
  }

  private renderRule(ruleInfo: RuleInfo.AsObject) {
    this.heading(2, ruleInfo.ruleName);
    this.writeln(ruleInfo.docString);

    if (ruleInfo.attributeList) {
      this.renderAttributeList(ruleInfo.attributeList);
    }
  }

  private renderFunction(functionInfo: StarlarkFunctionInfo.AsObject) {
    this.heading(2, functionInfo.functionName);
    this.writeln(functionInfo.docString);

    if (functionInfo.parameterList) {
      this.renderAttributeList(functionInfo.parameterList);
    }
  }

  private renderAttributeList(attributes: AttributeObjectList) {
    this.heading(4, 'Attributes');
    attributes.forEach(attr => {
      this.heading(5, attr.mandatory ? `${attr.name} (required)` : attr.name, 'attribute');
      if (attr.type !== undefined && attr.type !== 0) {
        this.heading(6, this.attributeTypes.get(attr.type), 'attribute-type');
      }

      this.writeln(attr.docString);
    });
  }

  private renderProvider(providerInfo: ProviderInfo.AsObject) {
    this.heading(2, providerInfo.providerName);
    this.writeln(providerInfo.docString);

    if (providerInfo.fieldInfoList) {
      this.heading(4, 'Fields');
      providerInfo.fieldInfoList.forEach(field => {
        this.heading(5, field.name, 'attribute');
        this.writeln(field.docString);
      });
    }
  }

  private renderAspect(aspectInfo: AspectInfo.AsObject) {
    this.heading(2, aspectInfo.aspectName);
    const attributes = aspectInfo.aspectAttributeList.join(', ');
    this.heading(6, `Aspect attributes: ${attributes}`, 'attribute-type');
    this.writeln(aspectInfo.docString);

    if (aspectInfo.attributeList) {
      this.renderAttributeList(aspectInfo.attributeList);
    }
  }

  private heading(level: number, content: string, css?: string) {
    this.writeln('\n');
    this.write(new Array(level).fill('#').join(''));
    if (this.fancy && css) {
      this.write(` .${css}`);
    }
    this.writeln(` ${content}`);
  }

  private writeln(content?: string) {
    this.write(content, true);
  }

  private write(content = '', cr = false) {
    this.markdown.push(content);
    if (cr) {
      this.markdown.push('\n');
    }
  }
}

function getFlag(flag: string): string|undefined {
  const arg = process.argv.find(arg => arg.startsWith(`${flag}=`));
  if (arg) {
    return arg.split('=')[1];
  }
}

const stardocProtoOutputPath = getFlag('--in');
const preambleFilePath = getFlag('--preamble');
const preamble = [];
if (preambleFilePath) {
  const preambleContent = readFileSync(preambleFilePath, {encoding: 'utf8'});
  preamble.push(preambleContent);
}

const stardocProtoOutput = readFileSync(stardocProtoOutputPath);
const moduleInfo = ModuleInfo.deserializeBinary(stardocProtoOutput).toObject();

const fancy = getFlag('--fancy');
const renderer = new MarkdownStardocRenderer(moduleInfo, preamble, !!fancy);
const content = renderer.render();

if (renderer.hasContent()) {
  const outfilePath = getFlag('--out');
  if (outfilePath) {
    writeFileSync(outfilePath, content, {encoding: 'utf8'});
  }

  const outJsonPath = getFlag('--json');
  if (outJsonPath) {
    writeFileSync(
        outJsonPath, JSON.stringify(moduleInfo.ruleInfoList[0], null, 2), {encoding: 'utf8'});
  }
}
