
import { PinType } from '../classes/constants.js';

export const BUILTIN_NODES = {
  EVENT: {
    title: 'On Begin Play',
    category: 'Events',
    color: 'bg-red-600',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    glowRGB: '239, 68, 68',
    inputs: [],
    outputs: [{ name: '', type: PinType.EXEC }],
    onExecute: async (node) => {
      await node.triggerOutput('');
    }
  },
  DELAY: {
    title: 'Delay',
    category: 'Flow Control',
    color: 'bg-zinc-600',
    glowColor: 'rgba(161, 161, 170, 0.4)',
    glowRGB: '161, 161, 170',
    inputs: [
      { name: '', type: PinType.EXEC },
      { name: 'Duration', type: PinType.NUMBER }
    ],
    outputs: [{ name: 'Completed', type: PinType.EXEC }],
    defaultValues: { 'Duration': 1.0 },
    customBody: `
      <div class="mt-2 flex items-center justify-between gap-2">
        <span class="text-[9px] text-zinc-500 uppercase">Secs</span>
        <input type="number" step="0.1" data-bind="Duration" class="w-20 bg-black/40 border border-zinc-700 rounded text-xs px-2 py-1 outline-none focus:border-zinc-500 text-amber-500 font-mono" />
      </div>
    `,
    onExecute: async (node) => {
      const duration = parseFloat(await node.getInputValue('Duration')) || 0;
      node.element.style.opacity = '0.7';
      await new Promise(resolve => setTimeout(resolve, duration * 1000));
      node.element.style.opacity = '1.0';
      await node.triggerOutput('Completed');
    }
  },
  PRINT: {
    title: 'Print String',
    category: 'Utilities',
    color: 'bg-blue-600',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    glowRGB: '37, 99, 235',
    inputs: [
      { name: '', type: PinType.EXEC },
      { name: 'In String', type: PinType.STRING }
    ],
    outputs: [{ name: '', type: PinType.EXEC }],
    defaultValues: {
      'In String': 'Hello World'
    },
    onExecute: async (node) => {
      const message = await node.getInputValue('In String');
      node.editor.log(message, 'success');
      await node.triggerOutput('');
    }
  },
  FOR_LOOP: {
    title: 'For Loop',
    category: 'Flow Control',
    color: 'bg-zinc-600',
    glowColor: 'rgba(161, 161, 170, 0.4)',
    glowRGB: '161, 161, 170',
    inputs: [
      { name: '', type: PinType.EXEC },
      { name: 'First Index', type: PinType.NUMBER },
      { name: 'Last Index', type: PinType.NUMBER }
    ],
    outputs: [
      { name: 'Loop Body', type: PinType.EXEC },
      { name: 'Index', type: PinType.NUMBER },
      { name: 'Completed', type: PinType.EXEC }
    ],
    defaultValues: {
      'First Index': 0,
      'Last Index': 5
    },
    customBody: `
      <div class="flex flex-col gap-2 mt-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[9px] text-zinc-500 uppercase">Static Start</span>
          <input type="number" data-bind="First Index" class="w-16 bg-black/40 border border-zinc-700 rounded text-[10px] px-1 py-0.5 outline-none focus:border-zinc-500 text-amber-500" />
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[9px] text-zinc-500 uppercase">Static End</span>
          <input type="number" data-bind="Last Index" class="w-16 bg-black/40 border border-zinc-700 rounded text-[10px] px-1 py-0.5 outline-none focus:border-zinc-500 text-amber-500" />
        </div>
      </div>
    `,
    onExecute: async (node) => {
      const first = parseInt(await node.getInputValue('First Index'));
      const last = parseInt(await node.getInputValue('Last Index'));
      
      for (let i = first; i <= last; i++) {
        node.state = { currentIndex: i };
        await node.triggerOutput('Loop Body');
      }
      
      await node.triggerOutput('Completed');
    },
    getOutputValue: async (node, pinName) => {
      if (pinName === 'Index') {
        return node.state?.currentIndex ?? 0;
      }
      return 0;
    }
  },
  INTEGER_LITERAL: {
    title: 'Integer',
    category: 'Constants',
    color: 'bg-emerald-700',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    glowRGB: '16, 185, 129',
    inputs: [],
    outputs: [{ name: 'Value', type: PinType.NUMBER }],
    defaultValues: { 'Value': 0 },
    customBody: `
      <div class="mt-2">
        <input type="number" data-bind="Value" class="w-full bg-black/40 border border-zinc-700 rounded text-xs px-2 py-1 outline-none focus:border-emerald-500 text-emerald-400 font-mono" />
      </div>
    `,
    getOutputValue: async (node, pinName) => {
      return parseInt(node.template.defaultValues['Value']) || 0;
    }
  },
  APPEND: {
    title: 'Append Strings',
    category: 'String',
    color: 'bg-rose-700',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    glowRGB: '244, 63, 94',
    inputs: [
      { name: 'A', type: PinType.STRING },
      { name: 'B', type: PinType.STRING }
    ],
    outputs: [{ name: 'Result', type: PinType.STRING }],
    defaultValues: { 'A': '', 'B': '' },
    getOutputValue: async (node, pinName) => {
      const a = await node.getInputValue('A');
      const b = await node.getInputValue('B');
      return String(a) + String(b);
    }
  },
  MULTI_LINE_STRING: {
    title: 'String (Multi-line)',
    category: 'String',
    color: 'bg-rose-700',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    glowRGB: '244, 63, 94',
    inputs: [],
    outputs: [{ name: 'Value', type: PinType.STRING }],
    defaultValues: { 'Value': '' },
    customBody: `
      <div class="mt-2">
        <textarea data-bind="Value" rows="4" class="w-full bg-black/40 border border-zinc-700 rounded text-xs px-2 py-1 outline-none focus:border-rose-500 text-rose-300 font-mono resize-y min-h-[60px]"></textarea>
      </div>
    `,
    getOutputValue: async (node, pinName) => {
      return node.template.defaultValues['Value'] || "";
    }
  },
  ADD: {
    title: 'Add',
    category: 'Math',
    color: 'bg-emerald-600',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    glowRGB: '16, 185, 129',
    inputs: [
      { name: 'A', type: PinType.NUMBER },
      { name: 'B', type: PinType.NUMBER }
    ],
    outputs: [{ name: 'Result', type: PinType.NUMBER }],
    defaultValues: { 'A': 0, 'B': 0 },
    getOutputValue: async (node, pinName) => {
      const a = parseFloat(await node.getInputValue('A')) || 0;
      const b = parseFloat(await node.getInputValue('B')) || 0;
      return a + b;
    }
  },
  SUBTRACT: {
    title: 'Subtract',
    category: 'Math',
    color: 'bg-emerald-600',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    glowRGB: '16, 185, 129',
    inputs: [
      { name: 'A', type: PinType.NUMBER },
      { name: 'B', type: PinType.NUMBER }
    ],
    outputs: [{ name: 'Result', type: PinType.NUMBER }],
    defaultValues: { 'A': 0, 'B': 0 },
    getOutputValue: async (node, pinName) => {
      const a = parseFloat(await node.getInputValue('A')) || 0;
      const b = parseFloat(await node.getInputValue('B')) || 0;
      return a - b;
    }
  },
  MULTIPLY: {
    title: 'Multiply',
    category: 'Math',
    color: 'bg-emerald-600',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    glowRGB: '16, 185, 129',
    inputs: [
      { name: 'A', type: PinType.NUMBER },
      { name: 'B', type: PinType.NUMBER }
    ],
    outputs: [{ name: 'Result', type: PinType.NUMBER }],
    defaultValues: { 'A': 0, 'B': 0 },
    getOutputValue: async (node, pinName) => {
      const a = parseFloat(await node.getInputValue('A')) || 0;
      const b = parseFloat(await node.getInputValue('B')) || 0;
      return a * b;
    }
  },
  BRANCH: {
    title: 'Branch',
    category: 'Flow Control',
    color: 'bg-zinc-600',
    glowColor: 'rgba(161, 161, 170, 0.4)',
    glowRGB: '161, 161, 170',
    inputs: [
      { name: '', type: PinType.EXEC },
      { name: 'Condition', type: PinType.BOOLEAN }
    ],
    outputs: [
      { name: 'True', type: PinType.EXEC },
      { name: 'False', type: PinType.EXEC }
    ],
    onExecute: async (node) => {
      const condition = !!(await node.getInputValue('Condition'));
      await node.triggerOutput(condition ? 'True' : 'False');
    }
  }
};
