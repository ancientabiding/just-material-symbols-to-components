//
// PLUGIN SCRIPT
//
//                     -(}-
//                      (\_  ._~''
//           ,_  _,.--..( ,_.+  (`\
//     -~.__--=_/'(    ` ) /  (  `'   aa
//              ,_/ \ /'.__,. ).
//           `_/     `\_  ._/ ` \ ,
//                      `
//

function convertToTitleCase(snakeCaseStr: string): string {
  return snakeCaseStr
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function findOrCreateIconsContainer(): FrameNode {
  const currentPage = figma.currentPage;

  // Look for "Icons" frame at page root or inside sections only
  for (const node of currentPage.children) {
    if (node.type === "FRAME" && node.name === "Icons") {
      return node as FrameNode;
    }

    if (node.type === "SECTION") {
      const frameInSection = node.findOne(
        (child) =>
          child.type === "FRAME" &&
          child.name === "Icons" &&
          child.parent?.type === "SECTION",
      ) as FrameNode;

      if (frameInSection) {
        return frameInSection;
      }
    }
  }

  // Create new container with auto layout
  const container = figma.createFrame();
  container.name = "Icons";
  container.layoutMode = "HORIZONTAL";
  container.layoutWrap = "WRAP";
  container.itemSpacing = 20;
  container.counterAxisSpacing = 20;
  container.paddingLeft = 20;
  container.paddingRight = 20;
  container.paddingTop = 20;
  container.paddingBottom = 20;
  container.resize(600, container.height);
  container.primaryAxisSizingMode = "FIXED";
  container.x = 0;
  container.y = 0;

  return container;
}

function processIconGroup(group: GroupNode): ComponentNode | null {
  try {
    // Validate Material Symbols structure
    const skipMessage = "is not a Material Symbol and will be skipped.";

    if (group.type !== "GROUP") {
      figma.notify(`${group.name} ${skipMessage}`);
      return null;
    }

    const groupName = group.name;
    const componentName = convertToTitleCase(groupName);
    const { width, height } = group;

    let iconVector: VectorNode | null = null;
    let hasBoundingBox = false;

    for (const child of group.children) {
      if (child.type === "VECTOR" && child.name === groupName) {
        iconVector = child as VectorNode;
      } else if (child.type === "RECTANGLE" && child.name === "Bounding box") {
        hasBoundingBox = true;
      }
    }

    if (!iconVector || !hasBoundingBox) {
      figma.notify(`${group.name} ${skipMessage}`);
      return null;
    }

    // Create component frame
    const componentFrame = figma.createFrame();
    componentFrame.name = componentName;
    componentFrame.resize(width, height);
    componentFrame.fills = [];
    componentFrame.constrainProportions = true;

    // Clone and configure icon
    const iconPath = iconVector.clone();
    iconPath.name = "Path";
    iconPath.fills = [
      {
        type: "SOLID",
        color: { r: 0, g: 0, b: 0 },
      },
    ];

    componentFrame.appendChild(iconPath);

    const component = figma.createComponentFromNode(componentFrame);
    const container = findOrCreateIconsContainer();
    container.appendChild(component);

    group.remove();

    return component;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    figma.notify(`Failed to process "${group.name}": ${message}`);
    return null;
  }
}

async function run() {
  const { selection } = figma.currentPage;

  if (selection.length === 0) {
    figma.notify("Select one or more Material Symbols to convert.");
    figma.closePlugin();
    return;
  }

  let convertedCount = 0;
  let skippedCount = 0;

  for (const node of selection) {
    if (node.type === "GROUP") {
      const result = processIconGroup(node as GroupNode);
      if (result) {
        convertedCount++;
      } else {
        skippedCount++;
      }
    } else {
      skippedCount++;
    }
  }

  // Report results
  if (convertedCount > 0 && skippedCount === 0) {
    figma.notify(
      `Converted ${convertedCount} icon component${convertedCount === 1 ? "" : "s"}.`,
    );
  } else if (convertedCount > 0 && skippedCount > 0) {
    figma.notify(
      `Converted ${convertedCount} icon component${convertedCount === 1 ? "" : "s"}. Skipped ${skippedCount} invalid item${skippedCount === 1 ? "" : "s"}.`,
    );
  } else if (skippedCount > 0) {
    figma.notify("No valid Material Symbols found in selection.");
  }

  figma.closePlugin();
}

run();
