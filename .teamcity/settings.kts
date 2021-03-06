import jetbrains.buildServer.configs.kotlin.v2019_2.vcs.GitVcsRoot
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.commitStatusPublisher
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.dockerSupport
import jetbrains.buildServer.configs.kotlin.v2019_2.DslContext
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.dockerCommand
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

object DocumentationVcs : GitVcsRoot({
    name = "DocumentationVcs"
    url = "https://github.com/JetBrains/teamcity-documentation.git"
    branch = "refs/heads/2020.2"
})

project {

    vcsRoot(DocumentationVcs)

    buildType(Build)
}

object Build : BuildType({
    name = "Build"

    vcs {
        root(DslContext.settingsRoot)
        root(DocumentationVcs, "+:. => temp/%Product%-documentation")
    }

    params {
        text("Product", "teamcity", "The name of the product to generate docs for")
        text("Ignore", "teamcity-documentation.md", "Comma-separated list of markdown files to exclude")
    }

    features {
        dockerSupport {
        }

        commitStatusPublisher {
            vcsRootExtId = "${DslContext.settingsRoot.id}"
            publisher = github {
                githubUrl = "https://api.github.com"
                authType = personalToken {
                    token = "credentialsJSON:acd2122e-313e-4b44-ba7f-61bfbfac5a72"
                }
            }
        }
    }

    steps {
        script {
            name = "Setup project"
            scriptContent = """
                rm -rf build
                mkdir build
            """.trimIndent()
        }

        script {
            name = "NPM Install"
            scriptContent = """
                npm install
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

        dockerCommand {
            name = "Build docker image"
            commandType = build {
                source = file {
                    path = "Dockerfile"
                }
                namesAndTags = "gallo-chrome"
                commandArgs = "--pull"
            }
            param("dockerImage.platform", "linux")
        }

        script {
            name = "Generate PDF file"
            dockerImage = "gallo-chrome"
            scriptContent = """
                node index.js --product=%Product% --ignore=%Ignore%
            """.trimIndent()
        }
    }

    artifactRules = "build"

    triggers {
        vcs {
        }
    }

})
