# Glossary: Matter-aware T3 Code (LOIS fork)

The vocabulary for the DTL fork of T3 Code that binds agent threads to Filevine cases. Where a
word collides with upstream T3 Code or with LOIS, the entry says which meaning wins here. The LOIS
teardown vocabulary lives in the Business-Context vault; this file translates it.

## Language

### Cases

**Matter**:
A Filevine case: one record in one Filevine org, identified by its Filevine project ID. The unit
an agent reads from and writes to.
_Avoid_: Project (that word belongs to T3 Code's workspace), case, Filevine project
_Note_: LOIS calls this a Project. The LOIS case study's "Project" is always a Matter here.

**Project**:
T3 Code's own term, unchanged: a directory-rooted workspace record on one environment. In this
fork a Project is a firm-level workspace, not a Matter.
_Avoid_: Using "project" for a Filevine case

**Org**:
One Filevine organization inside the firm's tenant, such as DTL Sandbox or a production office.
Every Matter belongs to exactly one Org.
_Avoid_: Office, workspace

**Production Org**:
An Org holding real client Matters. Writes to a Production Org are the ones the firm cares about
most.
_Avoid_: Live org, real org

**Sandbox Org**:
The DTL Sandbox Org, where test Matters live and writes are harmless.

**Matter selection**:
The set of Matters attached to a thread, from one up to six.
_Avoid_: Context, scope, project selection

**Picker**:
The dialog where a user searches Matters by name or Filevine project ID and builds the Matter
selection.
_Avoid_: Project search, selector

**Matter chip**:
The tag above the composer naming one selected Matter and its Org.
_Avoid_: Project chip, pill, badge

### Working

**Thread**:
T3 Code's term, unchanged: the durable conversation and work history. In this fork a thread also
carries a Matter selection.
_Avoid_: Conversation (LOIS's word), session

**Ask**:
The mode in which the agent may only read a Matter. No write tool is available.
_Avoid_: Project chat (LOIS's word), read-only mode, chat mode

**Work**:
The mode in which the agent may read Matters and propose writes to them. Every proposed write
waits for the user's approval.
_Avoid_: Deep mode, agent mode, full access

**Write**:
One change the agent makes to one Matter, such as creating a note or a task.
_Avoid_: Action, tool call, mutation

**Author of record**:
The Filevine user a Write is attributed to. Today that is the signed-in user; the body of every
Write carries an assistant marker so audit review can tell it from the user's own work.
_Avoid_: Service account (a future option, not what exists)

**Assistant marker**:
The fixed text at the start of a Write's body naming the assistant and the approving user.

### Evidence

**Citation**:
A reference inside an answer that points at its source in a Matter.
_Avoid_: Footnote, reference
_Note_: Upstream T3 Code has "assistant citations", which are the user quoting an agent reply.
That feature keeps its code name; in prose here it is a Quote, never a Citation.

**Quote**:
Upstream T3 Code's "assistant citation": an excerpt of an agent reply the user selects to send
back. Not a Citation.

**Proof**:
The source material behind a Citation: a Filevine record (note, section, task) or a region of a
document in the Matter.
_Avoid_: Evidence, source

### Access

**Tenant**:
The whole firm's Filevine account, containing every Org.
_Avoid_: Account, instance

**Mode ceiling**:
The broadest mode a policy allows a thread to run in. This fork sets the ceiling so that only Ask
and Work are reachable.
