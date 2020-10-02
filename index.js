const fs = require('fs');
const fsExtra = require('fs-extra');
const parser = require('xml2json');
const {argv} = require('yargs');
const docsPath = './teamcity-documentation';
const tempPath = './temp/teamcity-documentation';

// Clear out the temp directory
fsExtra.emptyDirSync('./temp/');

// Copy files from the cloned docs to the temp directory
fsExtra.copySync(docsPath, tempPath);

// Read the docs tree hierarchy
const xml = fs.readFileSync(tempPath + '/tc.tree');

const productVersion = fs.readFileSync(tempPath + '/current.help.version').toString().trim();

// Parse the XML topics to an object
const topics = parser.toJson(xml, { object: true });

var ignoreIds = [];

if (argv.ignore) {
    ignoreIds = argv.ignore.split(',');
}

var date = new Date().toLocaleDateString("en-US", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

var formattedContent = `

<div align="center">
    <br><br><br><br><br><br><br>
    <img src="../../../teamcity_logos/icon-teamcity.png" width="300">
    <br><br><br>
    <h1>TeamCity ${productVersion}<br>Documentation</h1>
    <br><br><br>
    <p>Generated on:<br>${date}</p>
</div>

<div style="page-break-after: always"></div>

`;

var x = 0;

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

        // Replace the "See Also" at end of markdown files
        data = data.replace(/<seealso>([\s\S]*?)<\/seealso>/gm, '');

        // Change heading indentations
        /*data = data.replace(/\n#### /gm, '\n##### ');
        data = data.replace(/\n### /gm, '\n#### ');
        data = data.replace(/\n## /gm, '\n### ');*/

        // Replace main title with proper markdown title
        data = data.replace(/\[\/\/]: # \(title: ([\s\S]*?)\)/gm, '# $1');

        // Remove hyperlinks and just leave text
        data = data.replace(/(?<!!)\[(.*?)\]\((.*?)\)/gm, '$1');
        //data = data.replace(/[^!]\[(.*?)\]\(.*?\)/gm, ' $1');
        //data = data.replace(/[^!]\[([^\[]+)\]\((.*)\)/gm, '$1');
        //data = data.replace(/\[([[:alnum:][:blank:]]*?)\]\(([\s\S]*?)\)/gm, '$1');
        //data = data.replace(/\[([\s\S]*?)\]\(([\s\S]*?)\)/gm, '$1');

        // Remove videos
        data = data.replace(/<video([\s\S]*?)\/>/gm, '');

        // Remove images
        //data = data.replace(/<img([\s\S]*?)\/>/gm, '');

        // Remove notes
        data = data.replace(/\[\/\/\](.*)\)/gm, '');

        // Format phrases that break pandoc
        data = data.replace(/__DOMAIN\\username__/gm, '`DOMAIN\\username`');

        // Page break after each physical markdown file
        data += '\n<div style="page-break-after: always"></div>\n\n\n';

        // Replace the contents of the current markdown file with the formatted text
        fs.writeFile(filePath, data, 'utf8', function (err) {
            if (err) {
                return console.log(err);
            }
        });

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

// Kick off the process with top level node
updateMarkdownFile(topics['product-profile']);

console.log('Processed a total of', x, 'files');

// Write out the master markdown file containing all the content.
// This will be converted to PDF separately by pandoc.
fs.writeFile(tempPath + '/topics/master.md', formattedContent, 'utf8', function (err) {
    if (err) {
        return console.log(err);
    }
});