import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { CreateChangeLogFrameAsyncMessage } from '@/types/AsyncMessages';

export const createChangeLogFrame = async (msg: CreateChangeLogFrameAsyncMessage) => {
    const { logs } = msg;

    const frame = figma.createFrame();
    frame.name = `Change Log - ${new Date().toLocaleString()}`;
    frame.resize(600, Math.max(200, logs.length * 40 + 100));
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'FIXED';
    frame.paddingLeft = 20;
    frame.paddingRight = 20;
    frame.paddingTop = 20;
    frame.paddingBottom = 20;
    frame.itemSpacing = 10;

    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

    const title = figma.createText();
    title.fontName = { family: 'Inter', style: 'Bold' };
    title.fontSize = 20;
    title.characters = 'Change Log';
    frame.appendChild(title);

    logs.forEach((log) => {
        const row = figma.createFrame();
        row.layoutMode = 'HORIZONTAL';
        row.counterAxisSizingMode = 'AUTO';
        row.primaryAxisSizingMode = 'FIXED';
        row.itemSpacing = 10;
        row.layoutAlign = 'STRETCH';

        const typeText = figma.createText();
        typeText.fontName = { family: 'Inter', style: 'Bold' };
        typeText.fontSize = 12;
        typeText.characters = log.type.toUpperCase();
        typeText.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]; // Gray color
        row.appendChild(typeText);

        const nameText = figma.createText();
        nameText.fontName = { family: 'Inter', style: 'Regular' };
        nameText.fontSize = 14;
        nameText.characters = log.name;
        row.appendChild(nameText);

        if (log.details) {
            const detailsText = figma.createText();
            detailsText.fontName = { family: 'Inter', style: 'Regular' };
            detailsText.fontSize = 12;
            detailsText.characters = log.details;
            detailsText.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
            row.appendChild(detailsText);
        }

        frame.appendChild(row);
    });

    figma.currentPage.appendChild(frame);
    figma.viewport.scrollAndZoomIntoView([frame]);
};
