import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

// Add Free Font Awesome Icons
// https://fontawesome.com/v6/icons?o=r&ic=free&s=solid
// In order to add an icon, you have to:
// 1) add the icon name in the import statement below;
// 2) add the icon name to the library.add() statement below.
import { faArrowLeft, faArrowRight, faArrowsRotate, faArrowUp, faCaretDown, faCaretUp, faExpand, faFolder, faFolderOpen, faList, faTableCellsLarge } from "@fortawesome/free-solid-svg-icons";

library.add([
    faFolder,
    faExpand,
    faArrowLeft,
    faArrowRight,
    faArrowUp,
    faArrowsRotate,
    faList,
    faTableCellsLarge,
    faFolderOpen,
    faCaretUp,
    faCaretDown,
]);

export { FontAwesomeIcon };
