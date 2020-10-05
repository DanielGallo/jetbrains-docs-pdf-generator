const fs = require('fs');
const fsExtra = require('fs-extra');
const parser = require('xml2json');
const {argv} = require('yargs');
const mdpdf = require('mdpdf');
const path = require('path');

var ignoreIds = [], // Array of markdown file names to exclude
    product = 'teamcity',   // Default product
    tempPath, logoPath, productDisplayName, productVersion;

if (argv.ignore) {
    ignoreIds = argv.ignore.split(',');
}

if (argv.product) {
    product = argv.product.trim();
}

tempPath = `temp/${product}-documentation`;
logoPath = `node_modules/@jetbrains/logos/${product}/og-image-1200x630.png`;

// Read the docs tree hierarchy
const xml = fs.readFileSync(tempPath + '/tc.tree');

productVersion = fs.readFileSync(tempPath + '/current.help.version').toString().trim();

// Parse the XML topics to an object
const topics = parser.toJson(xml, { object: true });

// Get the name of the product to include on the title page
productDisplayName = topics['product-profile'].name;

// Current date, formatted nicely for the title page
const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// Start off with a title page showing the product logo, product name, version, and generated date
var formattedContent = `

<div align="center">
    <br><br><br><br><br><br><br>
    <img src="../../../${logoPath}" height="300">
    <br><br><br>
    <h1>${productDisplayName} ${productVersion}<br>Documentation</h1>
    <br><br><br>
    <p>Generated on:<br>${date}</p>
</div>

<div style="page-break-after: always"></div>

`;

var x = 0;

/*
    Update each markdown file:
        - Remove notes, videos, hyperlinks.
        - Add a main title to the start of the file.
        - Add a page break at the end of the file.
 */
function updateMarkdownFile(topic) {
    var filePath,
        data;

    if (topic.id !== undefined
        && topic.id.indexOf('.md') > 0
        && !ignoreIds.includes(topic.id)) {

        console.log('Processing file:', topic.id);
        x ++;

        filePath = tempPath + '/topics/' + topic.id;

        data = fs.readFileSync(filePath).toString();

        // Remove the "See Also" at end of markdown files
        data = data.replace(/<seealso>([\s\S]*?)<\/seealso>/gm, '');

        // Replace main title with proper markdown title
        data = data.replace(/\[\/\/]: # \(title: ([\s\S]*?)\)/gm, '# $1');

        // Remove hyperlinks and just leave text
        data = data.replace(/(?<!!)\[(.*?)\]\((.*?)\)/gm, '$1');

        // Remove videos
        data = data.replace(/<video([\s\S]*?)\/>/gm, '');

        // Remove notes
        data = data.replace(/\[\/\/\](.*)\)/gm, '');

        // Re-format phrases that break pandoc
        data = data.replace(/__DOMAIN\\username__/gm, '`DOMAIN\\username`');

        // Add a page break after each physical markdown file
        data += '\n<div style="page-break-after: always"></div>\n\n\n';

        // Replace the contents of the current markdown file with the formatted text
        fs.writeFileSync(filePath, data);

        // Append the content from current markdown file to a master string containing content of all markdown files
        formattedContent += data;
    }

    // If there are child topics, run this function recursively for each of those child topics
    if (topic['toc-element']) {
        for (var i = 0; i < topic['toc-element'].length; i ++) {
            updateMarkdownFile(topic['toc-element'][i]);
        }
    }
}

// Kick off the process with the top-level node
updateMarkdownFile(topics['product-profile']);

console.log('Processed a total of', x, 'files');

// Write out the combined markdown file containing all of the content.
// This will need to be converted to PDF separately by pandoc.
fs.writeFileSync(tempPath + '/topics/_combined.md', formattedContent);

let pdfOptions = {
    source: path.join(__dirname, tempPath + '/topics/_combined.md'),
    destination: path.join(__dirname, `build/${productDisplayName}-docs.pdf`),
    styles: path.join(__dirname, 'styles.css'),
    defaultStyle: true,
    ghStyle: true,
    pdf: {
        format: 'A4',
        orientation: 'portrait'
    }
};

// Convert the combined markdown file to PDF
mdpdf.convert(pdfOptions).then((pdfPath) => {
    console.log('Generated PDF at the following path:', pdfPath);
}).catch((err) => {
    console.error(err);
});