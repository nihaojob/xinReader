/*
 * @Author: 秦少卫
 * @Date: 2021-05-13 19:23:05
 * @LastEditors: 秦少卫
 * @LastEditTime: 2021-05-16 00:33:44
 * @Description: file content
 */
const processItem = (item) => {
    const lines = item.trim().split('\n');
    if (lines.length < 3) {
        return undefined;
    }

    const firstLine = lines[0];

    const book = firstLine.split('(')[0].trim();

    var betweenBrackets = /\(([^)]+)\)/;
    let author = "";
    const authorMatch = betweenBrackets.exec(firstLine);
    if (authorMatch) {
        author = authorMatch[1];
    }

    const secondLine = lines[1];

    const details = secondLine.split('|');

    let date;
    let page;
    let location;
    // details format 1
    if (details.length === 3) {
        console.log(details)
        page = details[0].split('- 您在位置 ')[1];
        if (page) {
            page = page.trim();
        }
        location = details[1];
        if (location) {
            location = location.trim();
        }

        let dateStr = details[2].split('添加于 ')[1];
        if (dateStr) {
            date = dateStr;
        }

    } else if (details.length === 2) {

        page = undefined;
        location = details[0].split('- 您在位置 ')[1];

        let dateStr = details[1].split('添加于 ')[1];
        if (dateStr) {
            date = dateStr;
        }
    } else {
        console.error('Unknown format. Cannot parse location: ', details);
        return undefined;
    }

    const remainder = lines.slice(3).join('\n').trim();

    return {
        book,
        author,
        quote: remainder,
        page,
        location,
        dateAdded: date,
    };

}


const kindleParser = (text) => {
    const items = text.split('==========');
    items.pop();
    return items.map((item) => processItem(item)).filter((data) => data !== undefined);
};