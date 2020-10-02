import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.DslContext
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2019_2.project
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.vcs
import jetbrains.buildServer.configs.kotlin.v2019_2.version

/*
The settings script is an entry point for defining a TeamCity
project hierarchy. The script should contain a single call to the
project() function with a Project instance or an init function as
an argument.

VcsRoots, BuildTypes, Templates, and subprojects can be
registered inside the project using the vcsRoot(), buildType(),
template(), and subProject() methods respectively.

To debug settings scripts in command-line, run the

    mvnDebug org.jetbrains.teamcity:teamcity-configs-maven-plugin:generate

command and attach your debugger to the port 8000.

To debug in IntelliJ Idea, open the 'Maven Projects' tool window (View
-> Tool Windows -> Maven Projects), find the generate task node
(Plugins -> teamcity-configs -> teamcity-configs:generate), the
'Debug' option is available in the context menu for the task.
*/

version = "2020.1"

project {

    buildType(Build)
}

object Build : BuildType({
    name = "Build"

    vcs {
        root(DslContext.settingsRoot)
    }

    params {
        text("Product", "teamcity", "The name of the product to generate docs for")
        text("Ignore", "teamcity-documentation.md", "Comma-separated list of markdown files to exclude")
    }

    steps {
        script {
            name = "Setup project"
            scriptContent = "mkdir temp"
        }

        script {
            name = "Clone documentation repository"
            workingDir = "temp"
            scriptContent = """
                git clone https://github.com/JetBrains/%Product%-documentation
            """.trimIndent()
        }

        script {
            name = "Copy images"
            workingDir = "temp"
            scriptContent = """
                cd %Product%-documentation
                
                cp -r images/* topics/
            """.trimIndent()
        }

        script {
            name = "Generate master markdown file"
            scriptContent = """
                node index.js --product=%Product% --ignore=%Ignore%
            """.trimIndent()
        }

        script {
            name = "Generate PDF from markdown file"
            workingDir = "temp"
            scriptContent = """
                cd %Product%-documentation/topics
                
                pandoc _combined.md --from=gfm --pdf-engine=wkhtmltopdf --output ../../../build/%Product%-docs.pdf -c ../../../styles.css --highlight-style=pygments
            """.trimIndent()
        }
    }

    artifactRules = "build"

    triggers {
        vcs {
        }
    }
})